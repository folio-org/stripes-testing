import { createInteractor, Select } from '@bigtest/interactor';

function label(el) {
  return el.querySelector('label').innerText;
}

export default createInteractor('select')({
  selector: '[class^=select-]',
  locator: label,
  filters: {
    id: el => el.querySelector('select').id,
    label,
    ariaLabelledBy: el => el.querySelector('select').getAttribute('aria-labelledby'),
    placeholder: el => el.querySelector('select').getAttribute('placeholder'),
    value: el => el.querySelector('select').value,
    error: el => {
      const feedbackError = el.querySelector('[class^=feedbackError]');
      return feedbackError ? feedbackError.innerText : undefined;
    },
    warning: el => {
      const feedbackWarning = el.querySelector('[class^=feedbackWarning]');
      return feedbackWarning ? feedbackWarning.innerText : undefined;
    },
    valid: el => el.querySelector('select').getAttribute('aria-invalid') !== 'true'
  },
  actions: {
    choose: (interactor, value) => interactor.find(Select()).choose(value)
  }
});
