import { TextField, isVisible } from '@interactors/html';
import HTML from './baseHTML';

const toggle = (el) => el.querySelector('button').click();

export const SelectionOption = HTML.extend('selection option')
  .selector('li[class^=option]')
  .locator((el) => el.textContent)
  .filters({
    index: (el) => {
      return [...el.parentNode.querySelectorAll('li')].filter((o => o === el)).length;
    }
  })
  .actions({
    click: ({ perform }) => perform((el) => el.click()),
  });

export const SelectionList = HTML.extend('selection list')
  .selector('[class^=selectionListRoot]:not([hidden])')
  .filters({
    id: el => el.id,
    optionCount: (el) => [...el.querySelectorAll('li')].length,
  })
  .actions({
    filter: ({ find }, value) => find(TextField())
      .perform((el) => {
        el.focus();
        const property = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
        property.set.call(el, value);
        el.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste', bubbles: true, cancelable: false }));
      }),
    focusFilter: ({ perform }) => perform(el => el.querySelector('[class^=selectionFilter]').focus()),
    select: async (interactor, value) => {
      await interactor.find(SelectionOption(value)).click();
    }
  });

export default HTML.extend('selection')
  .selector('[class^=selectionControlContainer]')
  .locator((el) => {
    const label = el.parentNode.querySelector('label');
    return label ? label.textContent : '';
  })
  .filters({
    id: (el) => el.querySelector('[class^=selectionControl-]').id,
    value: (el) => el.querySelector('button').textContent,
    error: (el) => el.querySelector('[class^=feedbackError]').textContent,
    warning: (el) => el.querySelector('[class^=feedbackWarning]').textContent,
    open: (el) => {
      if (el.querySelector('button').getAttribute('aria-expanded') === 'true') {
        return !!document.querySelector('[class^=selectionListRoot]');
      }
      return false;
    },
    focused: (el) => !!el.querySelector('button:focused'),
  })
  .actions({
    open: ({ perform }) => perform(toggle),
    filterOptions: async ({ perform }, value) => {
      const optionsList = document.querySelector('[class^=selectionListRoot]');
      if (!(optionsList && isVisible(optionsList))) {
        await perform(toggle);
      }
      return perform(() => SelectionList().filter(value));
    },
    choose: async ({ perform }, value) => {
      const optionsList = document.querySelector('[class^=selectionListRoot]');
      if (!(optionsList && isVisible(optionsList))) {
        await perform(toggle);
      }
      return perform(() => SelectionList().find(SelectionOption(value)).click());
    },
    focus: ({ perform }) => perform((el) => el.querySelector('button').focus())
  });
