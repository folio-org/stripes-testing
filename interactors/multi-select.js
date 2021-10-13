import { createInteractor, HTML, including, TextField } from '@interactors/html';
import Button from './button';

const open = (el) => el.getAttribute('aria-expanded') === 'true';

const control = ({ shouldOpen = true } = {}) => async interactor => {
  let isOpen;
  await interactor.perform(el => {
    isOpen = open(el);
  });
  if (isOpen !== shouldOpen) {
    await interactor.toggle();
  }
};

const MultiSelectOption = HTML.extend('multi select option')
  .selector('[class^=multiSelectOption-]')
  .locator(el => el.querySelector('[class^=valueChipValue-]').textContent || '');

export default createInteractor('multi select')
  .locator(el => {
    const label = document.getElementById(el.getAttribute('aria-labelledby'));
    return (label && label.textContent) || '';
  })
  .selector('[role=application][class^=multiSelectContainer-]')
  .filters({
    open,
    selected: (element) => {
      const valueList = element.querySelector('ul[class^=multiSelectValueList-]');

      if (!valueList) return [];

      return Array.from(valueList.querySelectorAll('[class^=valueChipValue-]'))
        .map(valueChip => valueChip.textContent || '')
        .filter(Boolean);
    }
  })
  .actions({
    toggle: ({ find }) => find(Button({ ariaLabel: 'open menu' })).click(),
    open: control(),
    close: control({ shouldOpen: false }),
    fillIn: ({ find }, value) => find(TextField({ className: including('multiSelectFilterField-') })).fillIn(value),
    select: async (interactor, values) => {
      await interactor.open();
      for (const value of values) {
        await interactor.find(MultiSelectOption(value)).click();
      }
      await interactor.close();
    }
  });
