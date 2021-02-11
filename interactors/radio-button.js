import { HTML } from '@bigtest/interactor';

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
    click: ({ perform }) => perform((el) => { el.querySelector('label').click(); }),
    focus: ({ perform }) => perform((el) => { el.querySelector('input').focus(); }),
    blur: ({ perform }) => perform((el) => { el.querySelector('input').blur(); }),
    // TODO: when @bigtest/interactors version gets bumped, we can find
    // the built-in radio button interactor instead
    // focus: (interactor) => { interactor.find(RadioButton()).focus(); },
    // blur: (interactor) => { interactor.find(RadioButton()).blur(); },
  });
