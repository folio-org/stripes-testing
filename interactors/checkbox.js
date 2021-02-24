import { CheckBox, HTML } from '@bigtest/interactor';

export default HTML.extend('checkbox')
  .selector('div[class^=checkbox-]')
  .locator((el) => {
    const labelText = el.querySelector('[class^=labelText]');
    return labelText ? labelText.innerText : undefined;
  })
  .filters({
    id: (el) => el.querySelector('input').id,
    checked: (el) => el.querySelector('input').checked,
    valid: (el) => el.querySelector('input').validity.valid,
    value: (el) => el.querySelector('input').value,
    label: (el) => el.textContent,
    ariaLabel: (el) => el.querySelector('input').ariaLabel,
    ariaInvalid: (el) => el.querySelector('input').getAttribute('aria-invalid') === 'true',
    feedbackText: (el) => el.querySelector('[role=alert]').textContent,
    hasWarning: (el) => !!el.className.match(/hasWarning/),
    hasError: (el) => !!el.className.match(/hasError/),
    disabled: (el) => el.disabled,
    focused: (el) => el.contains(el.ownerDocument.activeElement),
  })
  .actions({
    focus: ({ perform }) => perform((el) => el.querySelector('label').focus()),
    click: ({ perform }) => perform((el) => el.querySelector('label').click()),
    // the input is actually transparent (opacity: 0) to opt for showing
    // an svg element instead, it is still clickable, but in reality not visible
    clickInput: ({ find }) => find(CheckBox({ visible: false })).click(),
    clickAndBlur: ({ perform }) => perform((el) => {
      el.querySelector('label').click();
      el.querySelector('input').blur();
    }),
  });
