import { isVisible } from 'element-is-visible';
import { including } from '@interactors/html';
import Button from './button';
import HTML from './baseHTML';

function title(el) { return el.querySelector('[class^=paneTitle]').textContent; }

export const PaneHeader = HTML.extend('pane header')
  .selector('[class^=paneHeader-]')
  .locator(title);

export default HTML.extend('pane')
  .selector('[class^=pane-]')
  .locator(title)
  .filters({
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
    id: el => el.getAttribute('id')
  })
  .actions({
    dismiss: (interactor) => interactor.find(Button({ ariaLabel: 'Close ' })).click(),
    clickAction: async (interactor, action) => {
      await interactor.find(Button({ className: including('actionMenuToggle') })).click();
      await Button(action).click();
    },
  });
