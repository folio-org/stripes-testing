import { createInteractor, perform } from '@bigtest/interactor';
import { isVisible } from 'element-is-visible';

export const Tooltip = createInteractor('tooltip')({
  selector: '[class^=tooltip], [id^=text][role=tooltip]',
  locator: (el) => el.querySelector('[class^=text]').textContent,
  filters: {
    text: (el) => el.querySelector('[class^=text]').textContent,
    sub: (el) => el.querySelector('[class^=sub]').textContent,
    visible: isVisible,
    id: (el) => el.id,
    proximity: {
      apply: (el) => {
        el.getAttribute('role') === 'tooltip'
      },
      default: false,
    }
  },
  actions: {
    pressEscape: perform((el) => {
      const kbEvent = new KeyboardEvent('keydown', {
        key: 'Escape'
      });
      return el.dispatchEvent(kbEvent);
    })
  }
});

export const TooltipProximity = createInteractor('tooltip proximity element')({
  selector: '[role^=tooltip]',
  locator: [
    (el) => el.querySelector('[class^=text]').textContent,
  ],
  filters: {
    text: (el) => el.querySelector('[class^=text]').textContent,
    id: (el) => el.id,
  }
});
