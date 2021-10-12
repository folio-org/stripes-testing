import { CheckBox } from '@interactors/html';
import { dispatchFocusout } from './util';
import HTML from './baseHTML';

export default HTML.extend('checkbox')
  .selector('div[class^=checkbox-]')
  .locator((el) => {
    const labelText = el.querySelector('[class^=labelText]');
    const input = el.querySelector('input');
    return labelText ? labelText.innerText : input.getAttribute('aria-label') || '';
  })
  .filters({
    id: (el) => el.querySelector('input').id,
    checked: (el) => el.querySelector('input').checked,
    valid: (el) => el.querySelector('input').validity.valid,
    value: (el) => el.querySelector('input').value,
    label: (el) => el.innerText,
    ariaLabel: (el) => el.querySelector('input').ariaLabel,
    ariaInvalid: (el) => el.querySelector('input').getAttribute('aria-invalid') === 'true',
    feedbackText: (el) => el.querySelector('[role=alert]').innerText,
    hasWarning: (el) => !!el.className.match(/hasWarning/),
    hasError: (el) => !!el.className.match(/hasError/),
    disabled: {
      apply: (el) => el.querySelector('input').disabled,
      default: false,
    },
    focused: (el) => el.contains(el.ownerDocument.activeElement),
  })
  .actions({
    focus: ({ perform }) => perform((el) => el.querySelector('input').focus()),
    click: ({ perform }) => perform((el) => el.querySelector('input').click()),
    // the input is actually transparent (opacity: 0) to opt for showing
    // an svg element instead, it is still clickable, but in reality not visible
    clickInput: ({ find }) => find(CheckBox({ visible: false })).click(),
    clickAndBlur: ({ perform }) => perform((el) => {
      el.querySelector('input').focus();
      el.querySelector('input').click();
      dispatchFocusout(el.querySelector('input'));
    }),
  });
