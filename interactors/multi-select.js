import { createInteractor, HTML, including, TextField } from '@interactors/html';
import Button from './button';

const open = (el) => el.getAttribute('aria-expanded') === 'true';

const control =
  ({ shouldOpen = true } = {}) => async (interactor) => {
    let isOpen;
    await interactor.perform((el) => {
      isOpen = open(el);
    });
    if (isOpen !== shouldOpen) {
      await interactor.toggle();
    }
  };

export const MultiSelectMenu = HTML.extend('multiselect dropdown')
  .selector('[class^=multiSelectMenu]')
  .filters({
    id: (el) => el.id,
    optionCount: (el) => el.querySelectorAll('li').length,
    error: (el) => el.querySelector('[class=^=multiSelectError-]').textContent,
    warning: (el) => el.querySelector('[class=^=multiSelectWarning-]').textContent,
    loading: (el) => el.querySelector('[class^=spinner-]'),
  });

export const MultiSelectOption = HTML.extend('multi select option')
  .selector('[class^=multiSelectOption-]')
  .locator((el) => {
    let str = el.textContent || '';
    str = str.replace(/[+-]$/, '');
    return str;
  })
  .filters({
    cursored: (el) => el.className.includes('cursor'),
    index: (el) => [...el.parentNode.children].indexOf(el),
    selected: (el) => el.className.includes('selected'),
    innerHTML: (el) => el.innerHTML,
  });

export const ValueChipRoot = HTML.extend('value chip root')
  .selector('[class^=valueChipRoot-]')
  .locator((el) => {
    let str = el.textContent || '';
    str = str.replace(/[+-]$/, '');
    return str;
  });

const select = async (interactor, values) => {
  await interactor.open();
  let valuesParam = values;
  if (typeof values === 'string') {
    valuesParam = [values];
  }
  for (const value of valuesParam) {
    await MultiSelectMenu().find(MultiSelectOption(value)).click();
  }

  await interactor.close();
};

export default createInteractor('multi select')
  .locator((el) => {
    const label = document.getElementById(el.getAttribute('aria-labelledby'));
    return (label && label.textContent) || '';
  })
  .selector('[role=application][class^=multiSelectContainer-]')
  .filters({
    open,
    label: (el) => el.querySelector('label').textContent,
    id: (el) => el.parentElement.id,
    placeholder: (el) => el.querySelector('input').placeholder,
    selected: (element) => {
      const valueList = element.querySelector('ul[class^=multiSelectValueList-]');

      if (!valueList) return [];

      return Array.from(valueList.querySelectorAll('[class^=valueChipValue-]'))
        .map((valueChip) => valueChip.textContent || '')
        .filter(Boolean);
    },
    selectedCount: (el) => el.querySelectorAll('[class^=valueChipValue-]').length,
    filterValue: (el) => el.querySelector('input').value,
    focused: (el) => Boolean(el.querySelector(':focus')),
    focusedValue: (el) => el.querySelector('ul').querySelector('button:focus').parentNode.textContent,
    error: (el) => el.querySelector('[class^=feedbackError]').textContent,
    ariaLabelledby: (el) => el.getAttribute('aria-labelledby'),
    span: (el) => el.querySelector('span').textContent,
  })
  .actions({
    toggle: ({ find }) => find(Button({ className: including('multiSelectToggleButton-') })).click(),
    open: control(),
    close: control({ shouldOpen: false }),
    fillIn: ({ find }, value) => find(TextField({ className: including('multiSelectFilterField-') })).fillIn(value),
    filter: ({ find }, value) => find(TextField({ className: including('multiSelectFilterField-') })).perform((el) => {
      el.focus();
      const property = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
      property.set.call(el, value);
      el.dispatchEvent(
        new InputEvent('input', {
          inputType: 'insertFromPaste',
          bubbles: true,
          cancelable: false,
        }),
      );
    }),
    select,
    choose: select,
    focus: ({ perform }) => perform((el) => el.querySelector('input').focus()),
  });
