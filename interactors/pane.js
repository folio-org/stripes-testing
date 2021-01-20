// TODO, import `focus`, and `blur` when updating to >0.22.0
import { createInteractor, focused } from '@bigtest/interactor';
// TODO, import from @bigtest/interactor when updating to >0.22.0
import { isVisible } from 'element-is-visible';
// eslint-disable-next-line import/no-named-default
import { default as Button } from './button';

function title(el) { return el.querySelector('[class^=paneTitle]').textContent; }

export default createInteractor('pane')({
  selector: '[class^=pane-]',
  locator: title,
  filters: {
    id: (el) => el.id,
    title,
    subtitle: (el) => el.querySelector('[class^=paneSub]').textContent,
    visible: {
      apply: (el) => isVisible(el) || (el.labels && Array.from(el.labels).some(isVisible)),
      default: true
    },
    index: (el) => {
      const set = el.parentNode;
      const panes = [...set.querySelectorAll('[class^=pane-]')];

      for (let i = 0; i < panes.length; i++) {
        if (el === panes[i]) {
          return i;
        }
      }

      return undefined;
    },
    focused
  },
  actions: {
    dismiss: (interactor) => interactor.find(Button({ ariaLabel: 'Close ' })).click(),
    // TODO, enable these when updating to >0.22.0
    // we should also add some tests for these?
    // focus,
    // blur
  }
});
