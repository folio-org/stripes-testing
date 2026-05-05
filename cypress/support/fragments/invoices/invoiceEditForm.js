import { HTML } from '@interactors/html';

import {
  Button,
  Checkbox,
  KeyValue,
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
  Pane,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME, INVOICE_VIEW_FIELDS } from '../../constants';
import { getLongDelay } from '../../utils/cypressTools';
import InteractorsTools from '../../utils/interactorsTools';
import FinanceHelper from '../finance/financeHelper';
import InvoiceStates from './invoiceStates';
import areYouSureModal from '../settings/bulk-edit/areYouSureModal';

const invoiceEditFormRoot = Section({ id: 'pane-invoice-form' });
const informationSection = invoiceEditFormRoot.find(Section({ id: 'invoiceForm-information' }));
const vendorInformationSection = invoiceEditFormRoot.find(
  Section({ id: 'invoiceForm-vendorDetails' }),
);
const extendedInformationSection = invoiceEditFormRoot.find(
  Section({ id: 'invoiceForm-extendedInformation' }),
);
const invoiceDetailsPane = Pane({ id: 'pane-invoiceDetails' });
const cancelButton = Button('Cancel');
const saveButton = Button('Save & close');
const saveAndKeepEditingButton = Button('Save & keep editing');
const deleteButton = Button({ icon: 'trash' });
const invoiceFormFieldSet = FieldSet({ id: 'invoice-form-links' });
const linkNameTextField = TextField('Link name*');
const externalUrlTextField = TextField('External URL');
const unsavedChangesMessage = 'There are unsaved changes';
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
  useExchangeRate: extendedInformationSection.find(Checkbox({ id: 'use-set-exchange-rate' })),
};

const buttons = {
  'Fiscal year': infoFields.fiscalYear,
  'Vendor name': vendorFields.vendorName,
  Cancel: cancelButton,
  'Save & close': saveButton,
  'Save & keep editing': saveAndKeepEditingButton,
  Delete: deleteButton,
};

const requiredFields = [
  { fieldName: INVOICE_VIEW_FIELDS.INVOICE_DATE, type: TextField },
  { fieldName: INVOICE_VIEW_FIELDS.BATCH_GROUP, type: Selection },
  { fieldName: INVOICE_VIEW_FIELDS.VENDOR_INVOICE_NUMBER, type: TextField },
  { fieldName: INVOICE_VIEW_FIELDS.VENDOR_NAME, type: TextField },
  { fieldName: INVOICE_VIEW_FIELDS.PAYMENT_METHOD, type: Select },
];

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
  checkFieldsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(invoiceEditFormRoot.find(KeyValue(label)).has(conditions));
    });
  },

  checkButtonsNotDisplayed(buttonsNotDisplayed = []) {
    buttonsNotDisplayed.forEach((label) => {
      cy.expect(buttons[label].absent());
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

  cancelWithUnsavedChanges({ keepEditing = false, shouldShowInvoiceDetails = false } = {}) {
    cy.do(cancelButton.click());
    areYouSureModal.verifyModalElements(unsavedChangesMessage);

    if (keepEditing) {
      areYouSureModal.clickKeepEditing();
      cy.expect(invoiceEditFormRoot.exists());
    } else {
      areYouSureModal.clickCloseWithoutSaving();
      cy.expect(invoiceEditFormRoot.absent());

      if (shouldShowInvoiceDetails) {
        cy.expect(invoiceDetailsPane.exists());
      } else {
        cy.expect(invoiceDetailsPane.absent());
      }
    }
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

  clickSaveAndKeepEditingButton({ isSaved = true } = {}) {
    cy.expect(saveAndKeepEditingButton.has({ disabled: false }));
    cy.do(saveAndKeepEditingButton.click());
    this.waitLoading();
    if (isSaved) {
      InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
    }
  },

  verifyIsExchangeRateChecked(isChecked) {
    if (isChecked) {
      cy.expect(extendedInfoFields.useExchangeRate.has({ checked: true }));
    } else {
      cy.expect(extendedInfoFields.useExchangeRate.has({ checked: false }));
    }
  },

  verifyIsSetExchangeRateRequired(isRequired) {
    if (isRequired) {
      cy.expect(extendedInfoFields.exchangeRate.has({ required: isRequired }));
    } else {
      cy.expect(extendedInfoFields.exchangeRate.has({ required: false }));
    }
  },

  checkRequiredFields(fields = []) {
    fields.forEach((field) => {
      const requiredFieldsConfig = requiredFields.find((f) => f.fieldName === field);
      if (!requiredFieldsConfig) throw new Error(`Unknown field: ${field}`);
      cy.expect(
        requiredFieldsConfig
          .type(including(requiredFieldsConfig.fieldName))
          .has({ error: 'Required!' }),
      );
    });
  },
};
