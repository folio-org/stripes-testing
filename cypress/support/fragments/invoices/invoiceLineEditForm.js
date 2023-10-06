import {
  Button,
  Checkbox,
  SearchField,
  Section,
  Selection,
  SelectionList,
  TextField,
} from '../../../../interactors';
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
  fillInvoiceFields(invoice) {
    if (invoice.status) {
      cy.do([Selection('Status*').open(), SelectionList().select(invoice.status)]);
    }
    if (invoice.invoiceDate) {
      cy.do(TextField('Invoice date*').fillIn(invoice.invoiceDate));
    }
    if (invoice.vendorInvoiceNo) {
      cy.do(TextField('Vendor invoice number*').fillIn(invoice.vendorInvoiceNo));
    }
    if (invoice.vendorName) {
      this.selectVendorOnUi(invoice.vendorName);
    }
    if (invoice.batchGroupName) {
      cy.do([Selection('Batch group*').open(), SelectionList().select(invoice.batchGroupName)]);
    }
    if (invoice.note) {
      cy.do(infoFields.note.fillIn(invoice.note));
      cy.expect(infoFields.note.has({ value: invoice.note }));
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
