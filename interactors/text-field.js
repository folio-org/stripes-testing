import { HTML, TextField } from '@bigtest/interactor';

import IconButton from './icon-button';

const label = (el) => {
  const labelText = el.querySelector('label');
  return labelText ? labelText.innerText : undefined;
};

export default HTML.extend('text field')
  .selector('div[class^=textField-]')
  .locator(label)
  .filters({
    id: (el) => el.querySelector('input').id,
    label,
    type: (el) => el.querySelector('input').type,
    value: (el) => el.querySelector('input').value,
    focused: (el) => el.querySelector('input').contains(el.ownerDocument.activeElement),
    readOnly: (el) => el.querySelector('input').hasAttribute('readOnly'),
    startControl: (el) => el.querySelector('[class^=startControls').textContent,
    endControl: (el) => el.querySelector('[class^=endControls').textContent,
    error: (el) => (el.querySelector('[class*=feedbackError-]') || {}).textContent,
    warning: (el) => (el.querySelector('[class*=feedbackWarning-]') || {}).textContent,
    valid: el => el.querySelector('input').getAttribute('aria-invalid') !== 'true'
  })
  .actions({
    blur: ({ perform }) => perform((el) => el.querySelector('input').blur()),
    clear: async ({ find, focus }) => {
      await focus();
      await find(IconButton({ icon: 'times-circle-solid' })).click();
    },
    fillIn: ({ find }, value) => find(TextField()).fillIn(value),
    focus: ({ perform }) => perform((el) => el.querySelector('input').focus()),
  });
