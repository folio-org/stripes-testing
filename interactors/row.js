import { createInteractor } from '@interactors/html';

export default createInteractor('row')
  .selector('[class^=row---]')
  .locator((el) => el.textContent.trim())
  .filters({
    index: (el) => {
      // Walk up to find the nearest ancestor that has more than one row--- child
      let parent = el.parentElement;
      while (parent) {
        const siblings = Array.from(parent.querySelectorAll(':scope > [class^=row---]'));
        if (siblings.length > 1) {
          return siblings.indexOf(el);
        }
        parent = parent.parentElement;
      }
      // Fallback: position among direct siblings
      const directSiblings = Array.from(
        el.parentElement.querySelectorAll(':scope > [class^=row---]'),
      );
      return directSiblings.indexOf(el);
    },
  });
