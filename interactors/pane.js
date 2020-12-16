import { createInteractor, Button } from '@bigtest/interactor';
import { isVisible } from 'element-is-visible';

function title(el) { return el.querySelector('[class^=paneTitle]')?.textContent; }

export default createInteractor('pane')({
  selector: '[class^=pane-]',
  locator: title,
  filters: {
    id: (el) => el.id,
    title,
    subTitle: (el) => el.querySelector('[class^=paneSub]').textContent,
    visible: {
      apply: (el) => isVisible(el) || (el.labels && Array.from(el.labels).some(isVisible)),
      default: true
    },
    index: (el) => {
      let set = el.parentNode;
      let panes = [...set.querySelectorAll('[class^=pane-]')];

      for (let i = 0; i < panes.length; i++) {
        if (el == panes[i]) {
          return i;
        }
      }
    }
  },
  actions: {
    dismiss: (interactor) => interactor.find(Button()).click()
  }
});
