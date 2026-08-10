export function isAdmin(userId: number | bigint | undefined, adminUserIds: bigint[]): boolean {
  if (userId === undefined) {
    return false;
  }

  const normalized = typeof userId === "bigint" ? userId : BigInt(userId);
  return adminUserIds.includes(normalized);
}
