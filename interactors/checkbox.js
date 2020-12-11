import { CheckBox, createInteractor, perform } from '@bigtest/interactor';

export default createInteractor('checkbox')({
  selector: 'div[class^=checkbox-]',
  locator: (el) => el.querySelector('[class^=labelText]')?.textContent,
  filters: {
    ...CheckBox().specification.filters,
    id: (el) => el.querySelector('input')?.id,
    checked: (el) => el.querySelector('input')?.checked,
    value: (el) => el.querySelector('input')?.value,
    label: (el) => el.textContent,
    ariaLabel: (el) => el.querySelector('input')?.ariaLabel,
    ariaInvalid: (el) => el.querySelector('input')?.getAttribute('aria-invalid') === 'true',
    feedbackText: (el) => el.querySelector('[role=alert]').textContent,
    hasWarning: (el) => !!el.className.match(/hasWarning/),
    hasError: (el) => !!el.className.match(/hasError/),
    disabled: (el) => el.disabled
  },
  actions: {
    focus: perform((el) => el.querySelector('label').focus()),
    click: perform((el) => el.querySelector('label').click()),
    // the input is actually transparent (opacity: 0) to opt for showing
    // an svg element instead, it is still clickable, but in reality not visible
    clickInput: (interactor) => interactor.find(CheckBox({visible: false})).click(),
    clickAndBlur: perform((el) => {
      el.querySelector('label').click();
      el.querySelector('input').blur();
    }),
  }
});
