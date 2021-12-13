import { RadioButton } from '@interactors/html';
import { dispatchFocusout } from './util';
import HTML from './baseHTML';

export default HTML.extend('radio button')
  .selector('div[class^=radioButton]')
  .locator((el) => el.querySelector('[class^=labelText]').textContent)
  .filters({
    title: (el) => el.querySelector('input').title,
    id: (el) => el.querySelector('input').id,
    valid: (el) => el.querySelector('input').validity.valid,
    checked: (el) => el.querySelector('input').checked,
    value: (el) => el.querySelector('input').value,
    label: (el) => el.textContent,
    feedbackText: (el) => el.querySelector('[class^=radioFeedback]').textContent,
    hasWarning: (el) => !!el.className.match(/hasWarning/),
    hasError: (el) => !!el.className.match(/hasError/),
    disabled: {
      apply: (el) => el.querySelector('input').disabled,
      default: false
    },
  })
  .actions({
    click: ({ find }) => find(RadioButton()).choose(),
    focus: ({ find }) => find(RadioButton()).perform(el => el.focus()),
    blur: ({ find }) => find(RadioButton()).perform(dispatchFocusout),
  });
