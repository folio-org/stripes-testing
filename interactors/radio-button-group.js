import { RadioButton } from '@interactors/html';
import { dispatchFocusout } from './util';
import HTML from './baseHTML';

const getByLabel = (el, label) => {
  const radio = [...el.querySelectorAll('[class^=labelText]')]
    .filter((e) => e.textContent === label);
  const input = radio ? radio.closest('[class^=radioButton]').querySelector('input[type=radio]') : undefined;
  return input;
};

export default HTML.extend('radio button group')
  .selector('fieldset[class^=groupRoot]')
  .locator((el) => el.querySelector('legend').textContent)
  .filters({
    id: (el) => el.id,
    option: getByLabel,
    checkedOption: (...args) => {
      const input = getByLabel(...args);
      return input.checked;
    },
    feedbackText: (el) => el.querySelector('[class^=radioFeedback]').textContent,
  })
  .actions({
    choose: ({ find }, label) => find(RadioButton(label)).choose(),
    click: ({ find }) => find(RadioButton()).choose(),
    focus: ({ find }, label) => find(RadioButton(label)).perform(el => el.focus()),
    blur: ({ find }) => find(RadioButton({ focused: true })).perform(dispatchFocusout),
  });
