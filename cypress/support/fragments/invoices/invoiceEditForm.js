import { HTML } from '@interactors/html';

import {
  Button,
  SearchField,
  Section,
  Select,
  Selection,
  SelectionList,
  TextArea,
  TextField,
  FieldSet,
  including,
  MultiSelect,
  MultiSelectOption,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';
import { getLongDelay } from '../../utils/cypressTools';
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
const cancelButton = Button('Cancel');
const saveButton = Button('Save & close');
const deleteButton = Button({ icon: 'trash' });
const invoiceFormFieldSet = FieldSet({ id: 'invoice-form-links' });
const linkNameTextField = TextField('Link name*');
const externalUrlTextField = TextField('External URL');

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
  Cancel: cancelButton,
  'Save & close': saveButton,
  Delete: deleteButton,
};

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(invoiceEditFormRoot.exists());
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  checkFiscalYearIsAbsent() {
    cy.get('#selected-invoice-fiscal-year-item').invoke('text').should('eq', '');
  },
  checkIfFiscalYearIsNotExists() {
    cy.get('#selected-invoice-fiscal-year-item').should('not.exist');
  },
  checkCurrency(currency) {
    cy.expect(Button({ id: 'currency' }).has({ singleValue: currency }));
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
    if (invoice.acqUnits) {
      cy.do([
        MultiSelect({ id: 'invoice-acq-units' })
          .find(Button({ ariaLabel: 'open menu' }))
          .click(),
        cy.wait(4000),
        MultiSelectOption(...invoice.acqUnits).click(),
      ]);
    }
  },
  uploadFile(fileName) {
    cy.get('input[type=file]', getLongDelay()).attachFile(fileName);
    cy.expect(HTML(including(fileName)).exists());
  },
  addLinkToInvoice(name, url) {
    cy.do(Button('Add link').click());
    cy.expect([
      invoiceFormFieldSet.exists(),
      invoiceFormFieldSet.find(linkNameTextField).exists(),
      invoiceFormFieldSet.find(externalUrlTextField).exists(),
      invoiceFormFieldSet.find(deleteButton).exists(),
    ]);
    cy.do([
      invoiceFormFieldSet.find(linkNameTextField).fillIn(name),
      invoiceFormFieldSet.find(externalUrlTextField).fillIn(url),
    ]);
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(invoiceEditFormRoot.absent());
  },
  clickSaveButton({ invoiceCreated = true, invoiceLineCreated = false } = {}) {
    cy.expect(saveButton.has({ disabled: false }));
    cy.do(saveButton.click());

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
