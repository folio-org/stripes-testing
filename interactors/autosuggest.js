import { TextField } from '@interactors/html';
import HTML from './baseHTML';
import { dispatchInput, dispatchKeyDown, dispatchKeyUp, setValue, guessCode } from './helpers';

const open = (el) => el.getAttribute('aria-expanded') === 'true';

const fillInput = (element, value) => {
  const input = element.querySelector('input');
  input.focus();
  for (const letter of value) {
    if (dispatchKeyDown(input, { key: letter, code: guessCode(letter) })) {
      // don't change the value if the keydown event was stopped
      setValue(input, input.value + letter);
      // input is not dispatched if the keydown event was stopped
      dispatchInput(input, { inputType: 'insertText', data: letter });
    }
    // keyup is always dispatched
    dispatchKeyUp(input, { key: letter, code: guessCode(letter) });
  }
};

const clearInput = (element) => {
  const input = element.querySelector('input');
  input.focus();
  setValue(input, '');
};

const AutoSuggestOption = HTML.extend('auto-suggest option')
  .selector('[role=option]')
  .locator((el) => el.textContent || '');

export default HTML.extend('auto-suggest')
  .selector('[class^=downshift-]')
  .locator((el) => el.querySelector('label').textContent)
  .filters({
    open,
    selected: (element) => {
      const valueList = element.querySelector('ul[class^=autoSuggest-]');

      if (!valueList) return [];

      return Array.from(valueList.querySelectorAll('[role=option]'))
        .map((option) => option.textContent || '')
        .filter(Boolean);
    },
    value: (el) => el.querySelector('input').value,
  })
  .actions({
    fillIn: ({ find }, value) => find(TextField()).fillIn(value),
    enterFilter: ({ perform }, value) => perform((el) => fillInput(el, value)),
    select: async (interactor, value) => {
      if (interactor.is({ open: false })) {
        await interactor.perform(clearInput);
        await interactor.perform((el) => fillInput(el, value));
      }
      await interactor.find(AutoSuggestOption(value)).click();
    },
  });
