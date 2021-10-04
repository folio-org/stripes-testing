import { TextField } from '@interactors/html';
import HTML from './baseHTML';

const open = (el) => el.getAttribute('aria-expanded') === 'true';

const AutoSuggestOption = HTML.extend('auto-suggest option')
  .selector('[class^=autoSuggest]')
  .locator(el => el.querySelector('[role="option"]').textContent || '');

export default HTML.extend('auto-suggest')
  .selector('[class^=downshift-][data-test-autosuggest]')
  .locator(el => el.querySelector('label').textContent)
  .filters({
    open,
    selected: (element) => {
      const valueList = element.querySelector('ul[class^=autoSuggest-]');

      if (!valueList) return [];

      return Array.from(valueList.querySelectorAll('[role=option]'))
        .map(option => option.textContent || '')
        .filter(Boolean);
    },
    value: (el => el.querySelector('input').value),
  })
  .actions({
    fillIn: ({ find }, value) => find(TextField()).fillIn(value),
    select: async (interactor, value) => {
      await interactor.find(AutoSuggestOption(value)).click();
    }
  });
