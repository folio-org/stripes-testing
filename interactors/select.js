import { Select } from '@interactors/html';
import { dispatchFocusout } from './util';
import HTML from './baseHTML';

function label(el) {
  const container = el.querySelector('label');
  return container ? container.textContent : undefined;
}

const choose = (intr, value) => intr.find(Select()).choose(value);

const blur = (intr) => intr.perform(dispatchFocusout);
const focus = (intr) => intr.perform((el) => el.querySelector('select').focus());

export default HTML.extend('select')
  .selector('[class^=select-]')
  .locator(label)
  .filters({
    id: (el) => el.querySelector('select').id,
    name: (el) => el.querySelector('select').name,
    label,
    ariaLabel: (el) => el.querySelector('select').getAttribute('aria-label'),
    ariaLabelledBy: (el) => el.querySelector('select').getAttribute('aria-labelledby'),
    placeholder: (el) => el.querySelector('select').getAttribute('placeholder'),
    value: (el) => el.querySelector('select').value,
    content: (el) => el.querySelector('select').textContent,
    dataTestID: (el) => el.querySelector('select').getAttribute('data-testid'),
    error: (el) => {
      const feedbackError = el.querySelector('[class^=feedbackError]');
      return feedbackError ? feedbackError.textContent : undefined;
    },
    warning: (el) => {
      const feedbackWarning = el.querySelector('[class^=feedbackWarning]');
      return feedbackWarning ? feedbackWarning.textContent : undefined;
    },
    valid: (el) => el.querySelector('select').getAttribute('aria-invalid') !== 'true',
    disabled: (el) => el.querySelector('select').disabled,
  })
  .actions({
    choose,
    blur,
    focus,
    chooseAndBlur: (...args) => {
      focus(...args);
      choose(...args);
      return blur(...args);
    },
  });
