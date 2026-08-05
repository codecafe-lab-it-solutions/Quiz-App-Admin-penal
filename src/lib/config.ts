import { prisma } from "@/lib/db";

const DEFAULT_SUB_LIST = "C2";

/** The active semester-cycle code (isr_sub_available_tbl.sub_list) that scopes legacy course mapping reads. */
export async function getCurrentSubList(): Promise<string> {
  const row = await prisma.semesterConfig.findFirst();
  return row?.currentSubList ?? DEFAULT_SUB_LIST;
}

export async function setCurrentSubList(value: string) {
  const row = await prisma.semesterConfig.findFirst();
  if (row) {
    return prisma.semesterConfig.update({ where: { id: row.id }, data: { currentSubList: value } });
  }
  return prisma.semesterConfig.create({ data: { currentSubList: value } });
}

export async function listBatchRegistry() {
  return prisma.batchTableRegistry.findMany({ orderBy: { batchName: "asc" } });
}

export async function upsertBatchRegistryEntry(data: { batchName: string; tableName: string; isActive?: boolean }) {
  return prisma.batchTableRegistry.upsert({
    where: { batchName: data.batchName },
    update: { tableName: data.tableName, ...(data.isActive !== undefined ? { isActive: data.isActive } : {}) },
    create: { batchName: data.batchName, tableName: data.tableName, isActive: data.isActive ?? true },
  });
}

export async function setBatchRegistryActive(batchName: string, isActive: boolean) {
  return prisma.batchTableRegistry.update({ where: { batchName }, data: { isActive } });
}

export async function removeBatchRegistryEntry(batchName: string) {
  return prisma.batchTableRegistry.delete({ where: { batchName } });
}
