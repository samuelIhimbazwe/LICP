import { writeFileSync } from 'fs';
import { buildReportDocument, exportReportDocument, ALL_REPORT_SECTION_IDS } from '../lib/report-engine.ts';
import { prisma } from '../lib/prisma.ts';

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('No org');
    process.exit(1);
  }
  const user = await prisma.user.findFirst({ where: { organizationId: org.id } });
  const doc = await buildReportDocument({
    orgId: org.id,
    title: 'LICP Professional Report Smoke Test',
    generatedBy: user?.fullName ?? 'Tester',
    sections: ['executive-summary', 'compliance-metrics', 'security-snapshot'],
    filters: { dateRange: 'last-month' },
  });
  const { content, fileSize } = exportReportDocument(doc, 'pdf');
  const buf = Buffer.from(content, 'base64');
  writeFileSync('../docs/sample-licp-report.pdf', buf);
  console.log('OK sections', doc.sections.length, 'bytes', fileSize, 'header', buf.subarray(0, 8).toString());
  console.log('ALL catalog sections', ALL_REPORT_SECTION_IDS.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
