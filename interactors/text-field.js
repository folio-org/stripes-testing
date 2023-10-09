import { TextField } from '@interactors/html';
import { dispatchFocusout } from './util';
import HTML from './baseHTML';

import IconButton from './icon-button';

const label = (el) => {
  let labelEl = el.querySelector('label');
  const input = el.querySelector('input');
  if (!labelEl) labelEl = input ? (input.labels || [])[0] : null;
  return labelEl ? labelEl.textContent : input.getAttribute('aria-label') || '';
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
    disabled: (el) => el.querySelector('input').hasAttribute('disabled'),
    startControl: (el) => el.querySelector('[class^=startControls]').textContent,
    endControl: (el) => el.querySelector('[class^=endControls]').textContent,
    error: (el) => (el.querySelector('[class*=feedbackError-]') || {}).textContent,
    warning: (el) => (el.querySelector('[class*=feedbackWarning-]') || {}).textContent,
    valid: (el) => el.querySelector('input').getAttribute('aria-invalid') !== 'true',
    name: (el) => el.querySelector('input').name,
    placeholder: (el) => el.querySelector('input').placeholder,
    clearButton: (el) => {
      const clearBtn = [...el.querySelectorAll('[class^=iconButton]')].filter(
        (I) => I.getAttribute('icon') === 'clear',
      );
      return clearBtn.length === 1;
    },
    maxLength: (el) => el.querySelector('input').getAttribute('maxLength'),
  })
  .actions({
    blur: ({ find }) => find(TextField()).perform(dispatchFocusout),
    clear: async ({ perform, find }) => {
      await perform((el) => el.querySelector('input').focus());
      await find(IconButton({ icon: 'times-circle-solid' })).click();
    },
    fillIn: ({ find }, value) => find(TextField()).fillIn(value),
    focus: ({ find }) => find(TextField()).focus(),
  });

export const TextFieldIcon = HTML.extend('text field icon')
  .selector('div[class^=textFieldIcon-]')
  .filters({
    id: (el) => el.querySelector('span').id,
  });
