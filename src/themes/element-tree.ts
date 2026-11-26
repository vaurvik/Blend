import type { ThemeElement, LeafElement } from "./model";

/** Move antes do item de destino ou para dentro do container indicado. */
export function moveThemeElement(
  elements: ThemeElement[],
  movingId: string,
  targetId: string | null,
): ThemeElement[] {
  if (movingId === targetId) return elements;
  const moving = elements
    .flatMap((item) =>
      item.type === "container" ? [item, ...item.children] : [item],
    )
    .find((item) => item.id === movingId);
  if (!moving) return elements;
  const targetRoot = targetId
    ? elements.find((item) => item.id === targetId)
    : undefined;
  const targetParent = targetId
    ? elements.find(
        (item) =>
          item.type === "container" &&
          item.children.some((child) => child.id === targetId),
      )
    : undefined;
  if (targetId && !targetRoot && !targetParent) return elements;
  if (moving.type === "container" && targetParent) return elements;
  if (
    moving.type === "container" &&
    targetRoot?.type === "container" &&
    targetRoot.id === moving.id
  )
    return elements;
  const without = elements
    .filter((item) => item.id !== movingId)
    .map((item) =>
      item.type === "container"
        ? {
            ...item,
            children: item.children.filter((child) => child.id !== movingId),
          }
        : item,
    );
  if (
    moving.type !== "container" &&
    (targetParent || targetRoot?.type === "container")
  ) {
    const parentId = targetParent?.id || targetRoot!.id;
    return without.map((item) => {
      if (item.type !== "container" || item.id !== parentId) return item;
      const children = [...item.children];
      const targetIndex = targetParent
        ? children.findIndex((child) => child.id === targetId)
        : -1;
      children.splice(
        targetIndex < 0 ? children.length : targetIndex,
        0,
        moving as LeafElement,
      );
      return { ...item, children };
    });
  }
  const targetIndex = targetId
    ? without.findIndex((item) => item.id === targetId)
    : -1;
  const result = [...without];
  result.splice(targetIndex < 0 ? result.length : targetIndex, 0, moving);
  return result;
}
export function shiftThemeElement(
  elements: ThemeElement[],
  id: string,
  offset: -1 | 1,
): ThemeElement[] {
  const rootIndex = elements.findIndex((item) => item.id === id);
  if (rootIndex !== -1) {
    const target = rootIndex + offset;
    if (target < 0 || target >= elements.length) return elements;
    const result = [...elements];
    [result[rootIndex], result[target]] = [result[target], result[rootIndex]];
    return result;
  }
  return elements.map((item) => {
    if (item.type !== "container") return item;
    const index = item.children.findIndex((child) => child.id === id),
      target = index + offset;
    if (index < 0 || target < 0 || target >= item.children.length) return item;
    const children = [...item.children];
    [children[index], children[target]] = [children[target], children[index]];
    return { ...item, children };
  });
}
