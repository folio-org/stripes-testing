import { Button, TextField } from '@interactors/html';
import HTML from './baseHTML';

const toggle = (el) => el.querySelector('button').click();

export const SelectionList = HTML.extend('selection list')
  .selector('[class^=selectionListRoot]')
  .filters({
    optionCount: (el) => [...el.querySelectorAll('li')].length,
  })
  .actions({
    filter: ({ find }, value) => find(TextField()).fillIn(value)
  });

export const SelectionOption = HTML.extend('selection option')
  .selector('li[class^=option]')
  .locator((el) => el.textContent)
  .filters({
    index: (el) => {
      return [...el.parentNode.querySelectorAll('li')].filter((o => o === el)).length;
    }
  })
  .actions({
    click: ({ perform }) => perform((el) => el.click()),
  });

export default HTML.extend('selection')
  .selector('[class^=selectionControlContainer]')
  .locator((el) => {
    const label = el.parentNode.querySelector('label');
    return label ? label.textContent : '';
  })
  .filters({
    id: (el) => el.querySelector('button').id,
    value: (el) => el.querySelector('button').textContent,
    error: (el) => el.querySelector('[class^=feedbackError]').textContent,
    warning: (el) => el.querySelector('[class^=feedbackWarning]').textContent,
    open: (el) => {
      if (el.querySelector('button').getAttribute('aria-expanded') === 'true') {
        return !!document.querySelector('[class^=selectionListRoot]');
      }
      return false;
    },
    focused: (el) => !!el.querySelector('button:focused'),
  })
  .actions({
    toggle: ({ perform }) => perform(toggle),
    filterOptions: (interactor, value) => {
      if (interactor.has({ open: false })) {
        interactor.perform(toggle);
      }
      return interactor.perform(() => SelectionList().filter(value));
    },
    choose: (interactor, value) => {
      if (interactor.has({ open: false })) {
        interactor.perform(toggle);
      }
      SelectionList().find(SelectionOption(value)).click();
    }
  });
