import { perform, RadioButton } from '@interactors/html';
import { dispatchFocusout } from './util';
import HTML from './baseHTML';

export default HTML.extend('radio button group')
  .selector('fieldset[class^=groupRoot]')
  .locator((el) => el.querySelector('legend').textContent)
  .filters({
    id: (el) => el.id,
    option: (el, index) => {
      return [...el.querySelectorAll('input[type=radio]')]
        .filter((e, i) => i === index)[0];
    },
    checkedOption: (el, label) => {
      const radio = [...el.querySelectorAll('[class^=labelText]')]
        .filter((e, i) => e.textContent === label);
      const input = radio.closest('[class^=radioButton]').querySelector('input[type=radio]');
      return input.chedked;
    },
    feedbackText: (el) => el.querySelector('[class^=radioFeedback]').textContent,
  })
  .actions({
    choose: ({ find }, label) => find(RadioButton(label)).choose(),
    click: ({ find }) => find(RadioButton()).choose(),
    focus: ({ find }, label) => find(RadioButton(label)).perform(el => el.focus()),
    blur: ({ find }) => {
      find(RadioButton(':focused')).perform(dispatchFocusout);
    }
  });
