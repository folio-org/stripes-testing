import { createInteractor } from '@interactors/html';
import { isVisible } from 'element-is-visible';

export const Tooltip = createInteractor('tooltip')
  .selector('[class^=tooltip], [data-test-tooltip-proximity-element]')
  .locator((el) => {
    return el.querySelector('[class^=text], span[role=tooltip]').textContent;
  })
  .filters({
    text: (el) => el.querySelector('[class^=text]').textContent,
    subtext: (el) => el.querySelector('[class^=sub]').textContent,
    visible: isVisible,
    proximity: {
      apply: (el) => el.getAttribute('data-test-tooltip-proximity-element') === 'true',
      default: false,
    },
  });

export const TooltipProximity = createInteractor('tooltip proximity element')
  .selector('[role^=tooltip]')
  .locator([(el) => el.querySelector('[class^=text]').textContent])
  .filters({
    text: (el) => el.querySelector('[class^=text]').textContent,
  });
