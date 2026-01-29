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

const filter = ({ find }, value) => find(TextField({ className: including('multiSelectFilterField-') })).perform((el) => {
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
});

export const MultiSelectMenu = HTML.extend('multiselect dropdown')
  .selector('[class^=multiSelectMenu]')
  .filters({
    id: (el) => el.id,
    optionCount: (el) => el.querySelectorAll('li').length,
    optionList: (el) => [...el.querySelectorAll('li')].map(({ textContent }) => textContent),
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
    cursored: (el) => el.className.includes('Cursor'),
    index: (el) => [...el.parentNode.children].indexOf(el),
    selected: (el) => el.className.includes('selected'),
    innerHTML: (el) => el.innerHTML,
    totalRecords: (el) => {
      const records = el.querySelector('[class^=totalRecords]').textContent || '';
      return parseInt(records.replace(/[^0-9]/g, ''), 10);
    },
  })
  .actions({
    clickSegment: ({ perform }) => perform((el) => el.querySelector('[class^="optionSegment--"]').click()),
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
  if (!Array.isArray(values)) {
    valuesParam = [values];
  }
  for (const value of valuesParam) {
    await MultiSelectMenu().find(MultiSelectOption(value)).click();
  }

  await interactor.close();
};

const selectByIndex = async (interactor, index) => {
  await interactor.open();
  await MultiSelectMenu().find(MultiSelectOption({ index })).click();
  await interactor.close();
};

export default createInteractor('multi select')
  .locator((el) => {
    const filterfield = el.querySelector('[role=searchbox]');
    const ariaLabelledby = filterfield.getAttribute('aria-labelledby').split(' ')[0];
    const label = document.getElementById(ariaLabelledby);
    return (label && label.textContent) || '';
  })
  .selector('[role=application][class^=multiSelectContainer-]')
  .filters({
    open,
    label: (el) => el.querySelector('label').textContent,
    id: (el) => el.id,
    placeholder: (el) => el.querySelector('input').placeholder,
    selected: (element) => {
      const valueList = element.querySelector('ul[class^=multiSelectValueList-]');

      if (!valueList) return [];

      return Array.from(valueList.querySelectorAll('[class^=valueChipValue-]'))
        .map((valueChip) => valueChip.textContent || '')
        .filter(Boolean);
    },
    selectedCount: (el) => el.querySelectorAll('[class^=valueChipValue-]').length,
    optionsCount: (el) => el.querySelectorAll('[class^=multiSelectOption-]').length,
    filterValue: (el) => el.querySelector('input').value,
    focused: (el) => Boolean(el.querySelector(':focus')),
    focusedValue: (el) => el.querySelector('ul').querySelector('button:focus').parentNode.textContent,
    error: (el) => el.querySelector('[class^=feedbackError]').textContent,
    ariaLabelledby: (el) => el.querySelector('[role=combobox]').getAttribute('aria-labelledby'),
    span: (el) => el.querySelector('span').textContent,
  })
  .actions({
    toggle: ({ find }) => find(Button({ className: including('multiSelectToggleButton-') })).click(),
    open: control(),
    close: control({ shouldOpen: false }),
    fillIn: filter,
    filter,
    select,
    choose: select,
    selectByIndex,
    focus: ({ perform }) => perform((el) => el.querySelector('input').focus()),
  });
