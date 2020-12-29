import { createInteractor, TextField } from '@bigtest/interactor';

const label = (el) => {
  const labelText = el.querySelector('label');
  return labelText ? labelText.innerText : undefined;
};

export default createInteractor('text area')({
  selector: 'div[class^=textArea-]',
  locator: label,
  filters: {
    id: el => el.querySelector('textarea').getAttribute('id'),
    label,
    value: el => el.querySelector('textarea').value,
    warning: el => el.querySelector('[class^=feedbackWarning-]').textContent,
    error: el => el.querySelector('[class^=feedbackError-]').textContent,
    valid: el => el.querySelector('textarea').getAttribute('aria-invalid') !== 'true'
  },
  actions: {
    blur: (interactor) => interactor.find(TextField()).blur(),
    fillIn: (interactor, value) => interactor.find(TextField()).fillIn(value),
    focus: (interactor) => interactor.find(TextField()).focus(),
  }
});
