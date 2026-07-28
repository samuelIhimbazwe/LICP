import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { writeAuditLog } from '../lib/audit.js';
import { sendSmtpEmail } from '../lib/email.js';
import { scheduledReportEmail } from '../lib/email-templates.js';
import {
  REPORT_SECTION_CATALOG,
  REPORT_TEMPLATES,
  buildReportDocument,
  exportReportDocument,
  type ReportFilters,
  type ReportFormat,
} from '../lib/report-engine.js';
import {
  authenticate,
  requireAnalyticsAccess,
  requireAdmin,
  type AuthRequest,
} from '../middleware/auth.js';

export const reportsRouter = Router();

reportsRouter.use(authenticate, requireAnalyticsAccess);

const filterSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  jurisdiction: z.string().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
  dateRange: z.enum(['last-week', 'last-month', 'last-quarter', 'last-year', 'custom']).optional(),
});

function parseFilters(raw: unknown): ReportFilters {
  if (!raw || typeof raw !== 'object') return { dateRange: 'last-month' };
  const parsed = filterSchema.safeParse(raw);
  return parsed.success ? parsed.data : { dateRange: 'last-month' };
}

function parseFiltersArray(raw: unknown): ReportFilters {
  if (Array.isArray(raw) && raw[0] && typeof raw[0] === 'object') {
    return parseFilters(raw[0]);
  }
  return parseFilters(raw);
}

reportsRouter.get('/catalog', (_req, res) => {
  res.json({
    templates: REPORT_TEMPLATES,
    sections: REPORT_SECTION_CATALOG,
    exportFormats: ['pdf', 'csv', 'excel', 'json'],
    audiences: ['executive', 'compliance', 'audit', 'legal', 'board', 'operations'],
  });
});

reportsRouter.get('/templates', (_req, res) => {
  res.json({ templates: REPORT_TEMPLATES });
});

reportsRouter.get('/sections', (_req, res) => {
  res.json({ sections: REPORT_SECTION_CATALOG });
});

reportsRouter.get('/custom', async (req: AuthRequest, res) => {
  const reports = await prisma.customReport.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ reports });
});

reportsRouter.post('/custom', async (req: AuthRequest, res) => {
  const body = z
    .object({
      name: z.string().min(1),
      description: z.string().optional(),
      type: z.string().optional(),
      templateId: z.string().optional(),
      sections: z.array(z.string()).optional(),
      filters: z.union([filterSchema, z.array(filterSchema)]).optional(),
    })
    .parse(req.body);

  const template = REPORT_TEMPLATES.find((t) => t.id === body.templateId);
  const report = await prisma.customReport.create({
    data: {
      organizationId: req.user!.db.organizationId,
      name: body.name,
      description: body.description ?? template?.description ?? '',
      type: body.type ?? template?.type ?? 'custom',
      templateId: body.templateId,
      sections: body.sections ?? template?.sections ?? [],
      filters: (body.filters ?? { dateRange: 'last-month' }) as object,
      createdBy: req.user!.db.fullName,
    },
  });
  res.status(201).json({ report });
});

reportsRouter.get('/custom/:id', async (req: AuthRequest, res) => {
  const report = await prisma.customReport.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!report) {
    res.status(404).json({ error: 'Report not found.' });
    return;
  }
  res.json({ report });
});

reportsRouter.post('/preview', async (req: AuthRequest, res) => {
  const body = z
    .object({
      title: z.string().min(1),
      sections: z.array(z.string()).min(1),
      filters: filterSchema.optional(),
      templateId: z.string().optional(),
    })
    .parse(req.body);

  const template = body.templateId ? REPORT_TEMPLATES.find((t) => t.id === body.templateId) : undefined;
  const sections = body.sections.length ? body.sections : (template?.sections ?? []);
  const preview = await buildReportDocument({
    orgId: req.user!.db.organizationId,
    title: body.title,
    generatedBy: req.user!.db.fullName,
    generatedByRole: req.user!.db.role,
    sections,
    filters: body.filters ?? { dateRange: 'last-month' },
  });
  res.json({ preview });
});

reportsRouter.post('/generate', async (req: AuthRequest, res) => {
  const body = z
    .object({
      title: z.string().min(1),
      sections: z.array(z.string()).min(1),
      format: z.enum(['pdf', 'csv', 'excel', 'json']).optional(),
      filters: filterSchema.optional(),
      templateId: z.string().optional(),
      reportId: z.string().optional(),
    })
    .parse(req.body);

  const format = (body.format ?? 'pdf') as ReportFormat;
  const orgId = req.user!.db.organizationId;
  let reportId = body.reportId;
  let reportType = 'custom';

  if (!reportId) {
    const template = body.templateId ? REPORT_TEMPLATES.find((t) => t.id === body.templateId) : undefined;
    const saved = await prisma.customReport.create({
      data: {
        organizationId: orgId,
        name: body.title,
        description: template?.description ?? '',
        type: template?.type ?? 'custom',
        templateId: body.templateId,
        sections: body.sections,
        filters: (body.filters ?? { dateRange: 'last-month' }) as object,
        createdBy: req.user!.db.fullName,
      },
    });
    reportId = saved.id;
    reportType = saved.type;
  }

  const custom = await prisma.customReport.findFirst({ where: { id: reportId, organizationId: orgId } });
  if (!custom) {
    res.status(404).json({ error: 'Report not found.' });
    return;
  }

  const sections = Array.isArray(custom.sections) ? (custom.sections as string[]) : body.sections;
  const doc = await buildReportDocument({
    orgId,
    title: custom.name,
    generatedBy: req.user!.db.fullName,
    generatedByRole: req.user!.db.role,
    sections,
    filters: parseFiltersArray(custom.filters),
  });

  const { content, fileSize } = exportReportDocument(doc, format);
  const generated = await prisma.generatedReport.create({
    data: {
      organizationId: orgId,
      reportId: custom.id,
      reportName: custom.name,
      type: reportType,
      format,
      generatedBy: req.user!.db.fullName,
      content: format === 'pdf' ? content : content,
      fileSize,
      fileUrl: `/reports/generated`,
    },
  });

  await writeAuditLog({
    organizationId: orgId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'report_generated',
    resource: 'reports',
    resourceId: generated.id,
    resourceType: 'generated_report',
    actionDetails: `Generated report "${custom.name}" (${format})`,
    req,
  });

  res.status(201).json({ generated, preview: doc });
});

reportsRouter.get('/generated', async (req: AuthRequest, res) => {
  const items = await prisma.generatedReport.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ reports: items });
});

reportsRouter.get('/generated/:id/download', async (req: AuthRequest, res) => {
  const item = await prisma.generatedReport.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!item) {
    res.status(404).json({ error: 'Report not found.' });
    return;
  }

  const safeName = item.reportName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'report';

  if (item.format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    res.send(Buffer.from(item.content, 'base64'));
    return;
  }
  if (item.format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.json"`);
    res.send(item.content);
    return;
  }
  const ext = item.format === 'excel' ? 'csv' : 'csv';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.${ext}"`);
  res.send(item.content);
});

reportsRouter.post('/custom/:id/generate', async (req: AuthRequest, res) => {
  const format = String(req.query.format ?? req.body?.format ?? 'pdf') as ReportFormat;
  const report = await prisma.customReport.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!report) {
    res.status(404).json({ error: 'Report not found.' });
    return;
  }

  const sections = Array.isArray(report.sections) ? (report.sections as string[]) : [];
  const doc = await buildReportDocument({
    orgId: req.user!.db.organizationId,
    title: report.name,
    generatedBy: req.user!.db.fullName,
    generatedByRole: req.user!.db.role,
    sections,
    filters: parseFiltersArray(report.filters),
  });

  const { content, fileSize } = exportReportDocument(doc, format);
  const generated = await prisma.generatedReport.create({
    data: {
      organizationId: req.user!.db.organizationId,
      reportId: report.id,
      reportName: report.name,
      type: report.type,
      format,
      generatedBy: req.user!.db.fullName,
      content,
      fileSize,
      fileUrl: `/reports/generated/${report.id}`,
    },
  });

  await writeAuditLog({
    organizationId: req.user!.db.organizationId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'report_generated',
    resource: 'reports',
    resourceId: generated.id,
    resourceType: 'generated_report',
    actionDetails: `Generated report "${report.name}" (${format})`,
    req,
  });

  res.status(201).json({ generated, preview: doc });
});

reportsRouter.get('/scheduled', async (req: AuthRequest, res) => {
  const schedules = await prisma.scheduledReport.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: { nextRunDate: 'asc' },
  });
  res.json({ schedules });
});

reportsRouter.post('/scheduled', requireAdmin, async (req: AuthRequest, res) => {
  const body = z
    .object({
      reportId: z.string(),
      frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
      format: z.enum(['pdf', 'csv', 'excel', 'json']).optional(),
      recipients: z.array(z.string().email()),
    })
    .parse(req.body);

  const report = await prisma.customReport.findFirst({
    where: { id: body.reportId, organizationId: req.user!.db.organizationId },
  });
  if (!report) {
    res.status(404).json({ error: 'Report not found.' });
    return;
  }

  const days =
    body.frequency === 'daily' ? 1 : body.frequency === 'weekly' ? 7 : body.frequency === 'monthly' ? 30 : 90;
  const nextRunDate = new Date();
  nextRunDate.setDate(nextRunDate.getDate() + days);

  const schedule = await prisma.scheduledReport.create({
    data: {
      organizationId: req.user!.db.organizationId,
      reportId: report.id,
      reportName: report.name,
      frequency: body.frequency,
      format: body.format ?? 'pdf',
      recipients: body.recipients,
      nextRunDate,
      createdBy: req.user!.db.fullName,
    },
  });

  res.status(201).json({ schedule });
});

async function runScheduledReport(
  schedule: {
    id: string;
    reportId: string;
    reportName: string;
    format: string;
    recipients: unknown;
    organizationId: string;
    frequency: string;
  },
  req?: AuthRequest
) {
  const report = await prisma.customReport.findFirst({
    where: { id: schedule.reportId, organizationId: schedule.organizationId },
  });
  if (!report) return null;

  const sections = Array.isArray(report.sections) ? (report.sections as string[]) : [];
  const format = (schedule.format as ReportFormat) ?? 'pdf';
  const doc = await buildReportDocument({
    orgId: schedule.organizationId,
    title: report.name,
    generatedBy: 'scheduler',
    generatedByRole: 'system',
    sections,
    filters: parseFiltersArray(report.filters),
  });
  const { content, fileSize } = exportReportDocument(doc, format);

  const generated = await prisma.generatedReport.create({
    data: {
      organizationId: schedule.organizationId,
      reportId: schedule.reportId,
      reportName: schedule.reportName,
      format,
      generatedBy: 'scheduler',
      content,
      fileSize,
    },
  });

  const days =
    schedule.frequency === 'daily' ? 1 : schedule.frequency === 'weekly' ? 7 : schedule.frequency === 'monthly' ? 30 : 90;
  await prisma.scheduledReport.update({
    where: { id: schedule.id },
    data: { lastRunDate: new Date(), nextRunDate: new Date(Date.now() + days * 86400000) },
  });

  const recipients = Array.isArray(schedule.recipients) ? (schedule.recipients as string[]) : [];
  for (const to of recipients) {
    const { subject, html } = scheduledReportEmail(
      schedule.reportName,
      doc.periodLabel,
      'Sign in to LICP → Analytics & Reporting → Generated Reports Archive to download the file.'
    );
    await sendSmtpEmail(to, subject, html, { organizationId: schedule.organizationId });
  }

  if (req?.user) {
    await writeAuditLog({
      organizationId: schedule.organizationId,
      userId: req.user.db.id,
      userName: req.user.db.fullName,
      userRole: req.user.db.role,
      action: 'scheduled_report_run',
      resource: 'reports',
      resourceId: generated.id,
      resourceType: 'generated_report',
      actionDetails: `Ran scheduled report ${schedule.reportName}`,
      req,
    });
  }

  return { generated, emailed: recipients, preview: doc };
}

reportsRouter.post('/scheduled/:id/run', requireAdmin, async (req: AuthRequest, res) => {
  const schedule = await prisma.scheduledReport.findFirst({
    where: { id: String(req.params.id), organizationId: req.user!.db.organizationId },
  });
  if (!schedule) {
    res.status(404).json({ error: 'Schedule not found.' });
    return;
  }

  const result = await runScheduledReport(schedule, req);
  if (!result) {
    res.status(404).json({ error: 'Report definition not found.' });
    return;
  }
  res.json(result);
});

reportsRouter.post('/templates/:templateId/generate', async (req: AuthRequest, res) => {
  const template = REPORT_TEMPLATES.find((t) => t.id === String(req.params.templateId));
  if (!template) {
    res.status(404).json({ error: 'Template not found.' });
    return;
  }

  const body = z
    .object({
      format: z.enum(['pdf', 'csv', 'excel', 'json']).optional(),
      filters: filterSchema.optional(),
      saveAs: z.string().optional(),
    })
    .parse(req.body ?? {});

  const format = (body.format ?? template.recommendedFormats[0] ?? 'pdf') as ReportFormat;
  const orgId = req.user!.db.organizationId;
  const name = body.saveAs ?? `${template.name} — ${new Date().toISOString().slice(0, 10)}`;

  const saved = await prisma.customReport.create({
    data: {
      organizationId: orgId,
      name,
      description: template.description,
      type: template.type,
      templateId: template.id,
      sections: template.sections,
      filters: (body.filters ?? { dateRange: 'last-month' }) as object,
      createdBy: req.user!.db.fullName,
    },
  });

  const doc = await buildReportDocument({
    orgId,
    title: saved.name,
    generatedBy: req.user!.db.fullName,
    generatedByRole: req.user!.db.role,
    sections: template.sections,
    filters: body.filters ?? { dateRange: 'last-month' },
  });

  const { content, fileSize } = exportReportDocument(doc, format);
  const generated = await prisma.generatedReport.create({
    data: {
      organizationId: orgId,
      reportId: saved.id,
      reportName: saved.name,
      type: template.type,
      format,
      generatedBy: req.user!.db.fullName,
      content,
      fileSize,
    },
  });

  res.status(201).json({ generated, preview: doc, report: saved });
});
