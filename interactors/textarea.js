import { TextField } from '@interactors/html';
import { dispatchFocusout } from './util';
import HTML from './baseHTML';

const label = (el) => {
  const labelText = el.querySelector('label');
  return labelText ? labelText.innerText : undefined;
};

export default HTML.extend('text area')
  .selector('div[class^=textArea-]')
  .locator(label)
  .filters({
    id: el => el.querySelector('textarea').getAttribute('id'),
    label,
    value: el => el.querySelector('textarea').value,
    warning: el => el.querySelector('[class^=feedbackWarning-]').textContent,
    error: el => el.querySelector('[class^=feedbackError-]').textContent,
    valid: el => el.querySelector('textarea').getAttribute('aria-invalid') !== 'true'
  })
  .actions({
    blur: ({ find }) => find(TextField()).perform(dispatchFocusout),
    fillIn: ({ find }, value) => find(TextField()).fillIn(value),
    focus: ({ find }) => find(TextField()).focus(),
  });
