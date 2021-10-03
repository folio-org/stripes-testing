import { createInteractor, focused } from '@interactors/html';
import { isVisible } from 'element-is-visible';

export default createInteractor('layer')
  .selector('[class^=LayerRoot]')
  .locator((el) => el.ariaLabel)
  .filters({
    ariaLabel: (el) => el.ariaLabel,
    visible: {
      apply: (el) => isVisible(el) || (el.labels && Array.from(el.labels).some(isVisible)),
      default: true
    },
    focused
  });
