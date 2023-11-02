import {
  Button,
  SearchField,
  Section,
  Select,
  Selection,
  SelectionList,
  TextArea,
  TextField,
  including,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import FinanceHelper from '../finance/financeHelper';
import InvoiceStates from './invoiceStates';

const invoiceEditFormRoot = Section({ id: 'pane-invoice-form' });
const informationSection = invoiceEditFormRoot.find(Section({ id: 'invoiceForm-information' }));
const vendorInformationSection = invoiceEditFormRoot.find(
  Section({ id: 'invoiceForm-vendorDetails' }),
);
const extendedInformationSection = invoiceEditFormRoot.find(
  Section({ id: 'invoiceForm-extendedInformation' }),
);
const cancelButtom = Button('Cancel');
const saveButtom = Button('Save & close');

const infoFields = {
  fiscalYear: informationSection.find(Button({ id: 'invoice-fiscal-year' })),
  note: informationSection.find(TextArea({ id: 'note' })),
};

const vendorFields = {
  vendorInvoiceNo: vendorInformationSection.find(TextField({ id: 'vendorInvoiceNo' })),
  vendorName: vendorInformationSection.find(TextField({ id: 'vendorId' })),
  accountingCode: vendorInformationSection.find(Button({ id: 'accounting-code-selection' })),
};

const extendedInfoFields = {
  paymentMethod: extendedInformationSection.find(Select({ id: 'invoice-payment-method' })),
  exchangeRate: extendedInformationSection.find(TextField({ id: 'exchange-rate' })),
};

const buttons = {
  'Fiscal year': infoFields.fiscalYear,
  'Vendor name': vendorFields.vendorName,
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
      SearchField({ id: 'input-record-search' }).fillIn(vendorName),
      Button('Search').click(),
    ]);
    FinanceHelper.selectFromResultsList();
  },
  fillInvoiceFields(invoice) {
    if (invoice.fiscalYear) {
      cy.do([
        Selection(including('Fiscal year')).open(),
        SelectionList().select(invoice.fiscalYear),
      ]);
    }
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
    if (invoice.currency) {
      cy.do([Selection('Currency*').open(), SelectionList().select(invoice.currency)]);
    }
    if (invoice.exchangeRate) {
      cy.expect(extendedInfoFields.exchangeRate.has({ disabled: false }));
      cy.do(extendedInfoFields.exchangeRate.fillIn(invoice.exchangeRate));
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
  clickSaveButton({ invoiceCreated = true, invoiceLineCreated = false } = {}) {
    cy.expect(saveButtom.has({ disabled: false }));
    cy.do(saveButtom.click());

    if (invoiceCreated) {
      InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
    }

    if (invoiceLineCreated) {
      InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
    }
    // wait for changes to be applied
    cy.wait(2000);
  },
};
