import type { Contract, ContractFolder, ContractStatus } from '@prisma/client';

export function serializeFolder(folder: ContractFolder & { _count?: { contracts: number } }) {
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId ?? undefined,
    createdBy: folder.createdBy,
    createdAt: folder.createdAt.toISOString(),
    documentCount: folder._count?.contracts ?? 0,
  };
}

export function serializeContract(c: Contract) {
  const tags = Array.isArray(c.tags) ? (c.tags as string[]) : [];

  return {
    id: c.id,
    title: c.title,
    folderId: c.folderId ?? undefined,
    type: c.type,
    status: c.status as ContractStatus,
    counterparty: c.counterparty ?? undefined,
    contractValue: c.contractValue ?? undefined,
    currency: c.currency,
    startDate: c.startDate?.toISOString(),
    endDate: c.endDate?.toISOString(),
    expiryDate: c.expiryDate?.toISOString(),
    autoRenew: c.autoRenew,
    currentVersion: c.currentVersion,
    createdBy: c.createdBy,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    tags,
    fileUrl: c.fileUrl,
    fileSize: c.fileSize,
    content: c.content,
    signedAt: c.signedAt?.toISOString(),
    checkedOutBy: c.checkedOutBy ?? undefined,
    checkedOutAt: c.checkedOutAt?.toISOString(),
    requiresApproval: true,
    signatureRequired: true,
  };
}
