import {
  Button,
  SearchField,
  Section,
  Select,
  Selection,
  SelectionList,
  TextArea,
  TextField,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import FinanceHelper from '../finance/financeHelper';

const invoiceEditFormRoot = Section({ id: 'pane-invoice-form' });
const informationSection = invoiceEditFormRoot.find(Section({ id: 'invoiceForm-information' }));
const extendedInformationSection = invoiceEditFormRoot.find(
  Section({ id: 'invoiceForm-extendedInformation' }),
);
const inputRecordSearch = SearchField({ id: 'input-record-search' });
const searchButton = Button('Search');
const cancelButtom = Button('Cancel');
const saveButtom = Button('Save & close');

const invoiceStates = {
  invoiceCreatedMessage: 'Invoice has been saved',
  invoiceLineCreatedMessage: 'Invoice line has been saved',
  invoiceApprovedMessage: 'Invoice has been approved successfully',
  invoicePaidMessage: 'Invoice has been paid successfully',
  invoiceDeletedMessage: 'Invoice has been deleted',
};

const infoFields = {
  fiscalYear: informationSection.find(Button({ id: 'invoice-fiscal-year' })),
  note: informationSection.find(TextArea({ id: 'note' })),
};

const extendedInfoFields = {
  paymentMethod: extendedInformationSection.find(Select({ id: 'invoice-payment-method' })),
};

const buttons = {
  'Fiscal year': infoFields.fiscalYear,
  Cancel: cancelButtom,
  'Save & close': saveButtom,
};

export default {
  waitLoading() {
    cy.expect(invoiceEditFormRoot.exists());
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  checkFiscalYearIsAbsent() {
    cy.do(infoFields.fiscalYear.absent());
  },
  selectVendorOnUi(vendorName) {
    cy.do([
      Button('Organization look-up').click(),
      inputRecordSearch.fillIn(vendorName),
      searchButton.click(),
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
    if (invoice.paymentMethod) {
      cy.do(extendedInfoFields.paymentMethod.choose(invoice.paymentMethod));
    }
    if (invoice.note) {
      cy.do(infoFields.note.fillIn(invoice.note));
      cy.expect(infoFields.note.has({ value: invoice.note }));
    }
  },
  clickCancelButton() {
    cy.do(cancelButtom.click());
    cy.expect(invoiceEditFormRoot.absent());
  },
  clickSaveButton({ checkCalloutMessage = true } = {}) {
    cy.expect(saveButtom.has({ disabled: false }));
    cy.do(saveButtom.click());
    cy.expect(invoiceEditFormRoot.absent());

    if (checkCalloutMessage) {
      InteractorsTools.checkCalloutMessage(invoiceStates.invoiceCreatedMessage);
    }
    // wait for changes to be applied
    cy.wait(2000);
  },
};
