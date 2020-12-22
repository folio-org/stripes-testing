import { createInteractor, perform, TextField } from '@bigtest/interactor';

import IconButton from './icon-button';

const label = (el) => {
  const labelText = el.querySelector('label');
  return labelText ? labelText.innerText : undefined;
};

export default createInteractor('text field')({
  selector: 'div[class^=textField-]',
  locator: label,
  filters: {
    id: (el) => el.querySelector('input').id,
    label,
    type: (el) => el.querySelector('input').type,
    value: (el) => el.querySelector('input').value,
    focused: (el) => el.querySelector('input').contains(el.ownerDocument.activeElement),
    readOnly: (el) => el.querySelector('input').hasAttribute('readOnly'),
    startControl: (el) => el.querySelector('[class^=startControls').textContent,
    endControl: (el) => el.querySelector('[class^=endControls').textContent,
  },
  actions: {
    blur: perform((el) => el.querySelector('input').blur()),
    clear: async (interactor) => {
      await interactor.focus();
      await interactor.find(IconButton({ icon: 'times-circle-solid' })).click();
    },
    fillIn: (interactor, value) => interactor.find(TextField()).fillIn(value),
    focus: perform((el) => el.querySelector('input').focus()),
  }
});
