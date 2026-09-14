export function makeBackgroundInert(activeLayer: HTMLElement) {
  const changed = Array.from(document.body.children)
    .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== activeLayer && !element.inert);

  changed.forEach((element) => {
    element.inert = true;
  });

  return () => {
    changed.forEach((element) => {
      element.inert = false;
    });
  };
}
