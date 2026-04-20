export function userPartitionKey(ownerId: string): string {
  return `USER#${ownerId}`;
}

export function savedMenuSortKey(date: string, menuId: string): string {
  return `MENU#${date}#${menuId}`;
}

export function savedMenuSortKeyPrefix(): string {
  return "MENU#";
}
