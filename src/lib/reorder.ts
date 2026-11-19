/** Move one item inside a scoped list and give that scope a collision-free order. */
export function reorderScope<T extends { id: string; order: number }>(items: T[], scopeIds: string[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0) return items;
  const allowed = new Set(scopeIds);
  const scope = items.filter((item) => allowed.has(item.id)).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  if (from >= scope.length || to >= scope.length) return items;
  const next = scope.slice();
  const [moved] = next.splice(from, 1);
  if (!moved) return items;
  next.splice(to, 0, moved);

  const taken = new Set(items.filter((item) => !allowed.has(item.id)).map((item) => item.order));
  let cursor = scope.reduce((min, item) => Math.min(min, item.order), 0);
  const orderOf = new Map<string, number>();
  for (const item of next) {
    while (taken.has(cursor)) cursor += 1;
    orderOf.set(item.id, cursor);
    taken.add(cursor);
    cursor += 1;
  }

  let changed = false;
  const result = items.map((item) => {
    const order = orderOf.get(item.id);
    if (order === undefined || order === item.order) return item;
    changed = true;
    return { ...item, order };
  });
  return changed ? result : items;
}
