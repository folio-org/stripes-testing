import { Button, Checkbox, SearchField, Section, TextField } from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import FinanceHelper from '../finance/financeHelper';
import InvoiceStates from './invoiceStates';

const invoiceLineEditFormRoot = Section({ id: 'pane-invoice-line-form' });
const informationSection = invoiceLineEditFormRoot.find(
  Section({ id: 'invoiceLineForm-information' }),
);

const cancelButtom = Button('Cancel');
const saveButtom = Button('Save & close');

const infoFields = {
  releaseEncumbrance: informationSection.find(Checkbox({ name: 'releaseEncumbrance' })),
  subTotal: informationSection.find(TextField({ id: 'subTotal' })),
};

const buttons = {
  'Release encumbrance': infoFields.releaseEncumbrance,
  Cancel: cancelButtom,
  'Save & close': saveButtom,
};

export default {
  waitLoading() {
    cy.expect(invoiceLineEditFormRoot.exists());
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  selectOrderLines(orderLine) {
    cy.do([
      Button('POL look-up').click(),
      SearchField({ id: 'input-record-search' }).fillIn(orderLine),
      Button('Search').click(),
    ]);
    FinanceHelper.selectFromResultsList();
  },
  fillInvoiceFields(invoiceLine) {
    if (invoiceLine.subTotal) {
      cy.do(infoFields.subTotal.fillIn(invoiceLine.subTotal));
      cy.do(infoFields.subTotal.has({ value: invoiceLine.subTotal }));
    }
  },
  clickCancelButton() {
    cy.do(cancelButtom.click());
    cy.expect(invoiceLineEditFormRoot.absent());
  },
  clickSaveButton({ checkCalloutMessage = true } = {}) {
    cy.expect(saveButtom.has({ disabled: false }));
    cy.do(saveButtom.click());

    if (checkCalloutMessage) {
      InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
    }
    // wait for changes to be applied
    cy.wait(1000);
  },
};
