import { TextField } from '@interactors/html';
import { dispatchFocusout } from './util';
import HTML from './baseHTML';

const label = (el) => {
  const labelText = el.querySelector('label');
  return labelText ? labelText.textContent : undefined;
};

export default HTML.extend('text area')
  .selector('div[class^=textArea-]')
  .locator(label)
  .filters({
    id: (el) => el.querySelector('textarea').getAttribute('id'),
    ariaLabel: (el) => el.querySelector('textarea').getAttribute('aria-label'),
    cols: (el) => el.querySelector('textarea').getAttribute('cols'),
    label,
    value: (el) => el.querySelector('textarea').value,
    textContent: (el) => el.querySelector('textarea').textContent,
    warning: (el) => el.querySelector('[class^=feedbackWarning-]').textContent,
    error: (el) => el.querySelector('[class^=feedbackError-]')?.textContent,
    valid: (el) => el.querySelector('textarea').getAttribute('aria-invalid') !== 'true',
    name: (el) => el.querySelector('textarea').getAttribute('name'),
    disabled: (el) => el.querySelector('textarea').disabled,
  })
  .actions({
    blur: ({ find }) => find(TextField()).perform(dispatchFocusout),
    fillIn: ({ find }, value) => find(TextField()).fillIn(value),
    focus: ({ find }) => find(TextField()).focus(),
  });
