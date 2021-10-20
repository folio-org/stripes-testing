import { createInteractor, HTML, including } from '@interactors/html';
import Button from './button';

const SelectionOption = HTML.extend('selection option')
  .selector('[class^=optionSegment-]')
  .locator(el => el.textContent || '');

export const SelectionList = HTML.extend('selection options')
  .selector('[class^=selectionList-]')
  .filters({
    id: el => el.parentElement.id,
  })
  .actions({
    select: async (interactor, value) => {
      await interactor.find(SelectionOption(value)).click();
    },
  });

export default createInteractor('selection')
  .selector('[class^=selectionControlContainer-]')
  .filters({
    id: el => el.querySelector('[class^=selectionControl-]').getAttribute('id'),
  })
  .actions({
    open: ({ find }) => find(Button({ className: including('selectionControl-') })).click(),
  });
