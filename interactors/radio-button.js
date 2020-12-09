import { RadioButton, createInteractor, perform } from '@bigtest/interactor';

export default createInteractor('radio button')({
  selector: 'div[class^=radioButton]',
  locator: (el) => el.querySelector('[class^=labelText]')?.textContent,
  filters: {
    ...RadioButton().specification.filters,
    id: (el) => el.querySelector('input')?.id,
    checked: (el) => el.querySelector('input')?.checked,
    value: (el) => el.querySelector('input')?.value,
    label: (el) => el.textContent,
    feedbackText: (el) => el.querySelector('[class^=radioFeedback]').textContent,
    hasWarning: (el) => !!el.className.match(/hasWarning/),
    hasError: (el) => !!el.className.match(/hasError/),
    disabled: (el) => el.disabled // we have cases where it is undefined and then what?
  },
  actions: {
    ...RadioButton().specification.actions,
    click: perform((el) => { el.querySelector('label').click(); }),
    focus: perform((el) => { el.querySelector('input').focus(); }),
    blur: perform((el) => { el.querySelector('input').blur(); }),
  }
});
