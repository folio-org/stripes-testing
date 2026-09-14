import { including } from '@interactors/html';

import HTML from '../baseHTML';
import Button from '../button';
import Selection from '../selection';
import TextField from '../text-field';
import { RepeatableFieldItem } from '../repeatablefield';

export const AcqFundDistribution = HTML.extend('acq fund distribution')
  .selector('fieldset')
  .locator((el) => el.querySelector('legend')?.textContent.trim() ?? '')
  .filters({
    // Position among all fieldsets sharing the same legend text on the page.
    // Use AcqFundDistribution({ index: N }) when multiple FD sections appear.
    index: (el) => {
      const legend = el.querySelector('legend')?.textContent.trim();
      return [...el.ownerDocument.querySelectorAll('fieldset')]
        .filter((f) => f.querySelector('legend')?.textContent.trim() === legend)
        .indexOf(el);
    },
    rowCount: (el) => el.querySelectorAll('[class^=repeatableFieldItem-]').length,
  })
  .actions({
    addRow: (interactor) => interactor.find(Button('Add fund distribution')).click(),
    removeRow: (interactor, index = 0) => interactor
      .find(RepeatableFieldItem({ index }))
      .find(Button({ icon: 'trash' }))
      .click(),
    openFundSelector: (interactor, index = 0) => interactor
      .find(RepeatableFieldItem({ index }))
      .find(Selection(including('Fund ID')))
      .open(),
    openExpenseClassSelector: (interactor, index = 0) => {
      return interactor
        .find(RepeatableFieldItem({ index }))
        .find(Selection(including('Expense class')))
        .open();
    },
    fillValue: (interactor, { value, index = 0 }) => interactor.find(RepeatableFieldItem({ index })).find(TextField()).fillIn(String(value)),
    selectDistributionTypePercent: (interactor, index = 0) => interactor.find(RepeatableFieldItem({ index })).find(Button('%')).click(),
    selectDistributionTypeAmount: (interactor, index = 0) => interactor.find(RepeatableFieldItem({ index })).find(Button('$')).click(),
  });
