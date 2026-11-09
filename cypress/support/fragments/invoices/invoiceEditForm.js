import { HTML } from '@interactors/html';

import {
  Button,
  Card,
  Checkbox,
  KeyValue,
  RepeatableField,
  SearchField,
  Section,
  Select,
  Selection,
  SelectionList,
  SelectionOption,
  TextArea,
  TextField,
  FieldSet,
  including,
  not,
  MultiSelect,
  MultiSelectOption,
  Pane,
  ValueChipRoot,
} from '../../../../interactors';
import { COMMON_BUTTON_LABELS, DEFAULT_WAIT_TIME, INVOICE_VIEW_FIELDS } from '../../constants';
import { getLongDelay } from '../../utils/cypressTools';
import InteractorsTools from '../../utils/interactorsTools';
import FinanceHelper from '../finance/financeHelper';
import InvoiceStates from './invoiceStates';
import areYouSureModal from '../settings/bulk-edit/areYouSureModal';

const invoiceEditFormRoot = Section({ id: 'pane-invoice-form' });
const invoiceAcqUnitsMultiSelect = invoiceEditFormRoot.find(
  MultiSelect({ id: 'invoice-acq-units' }),
);
const informationSection = invoiceEditFormRoot.find(Section({ id: 'invoiceForm-information' }));
const vendorInformationSection = invoiceEditFormRoot.find(
  Section({ id: 'invoiceForm-vendorDetails' }),
);
const extendedInformationSection = invoiceEditFormRoot.find(
  Section({ id: 'invoiceForm-extendedInformation' }),
);
const documentsSection = invoiceEditFormRoot.find(Section({ id: 'invoiceForm-documents' }));
const invoiceDetailsPane = Pane({ id: 'pane-invoiceDetails' });
const cancelButton = Button('Cancel');
const saveButton = Button(COMMON_BUTTON_LABELS.SAVE_AND_CLOSE);
const saveAndKeepEditingButton = Button(COMMON_BUTTON_LABELS.SAVE_AND_KEEP_EDITING);
const deleteButton = Button({ icon: 'trash' });
const clearButton = Button({ icon: 'times-circle-solid' });
const invoiceFormFieldSet = FieldSet({ id: 'invoice-form-links' });
const linkNameTextField = TextField('Link name*');
const externalUrlTextField = TextField('External URL');
const currencySelection = Selection('Currency*');
const adjustmentExpenseClassSelection = invoiceEditFormRoot.find(
  Selection(including('Expense class')),
);
const adjustmentsField = invoiceEditFormRoot.find(RepeatableField({ id: 'adjustments' }));
const getAdjustmentCard = (index) => adjustmentsField.find(Card({ headerStart: `Adjustment ${index + 1}` }));
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
  [COMMON_BUTTON_LABELS.CANCEL]: cancelButton,
  [COMMON_BUTTON_LABELS.SAVE_AND_CLOSE]: saveButton,
  [COMMON_BUTTON_LABELS.SAVE_AND_KEEP_EDITING]: saveAndKeepEditingButton,
  [COMMON_BUTTON_LABELS.DELETE]: deleteButton,
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
  checkCurrencyCode(currencyCode) {
    cy.expect(Button({ id: 'currency' }).has({ singleValue: including(`(${currencyCode})`) }));
  },
  checkCurrencyOptions(currencyCodes = [], { isPresent = true } = {}) {
    cy.get('#currency').scrollIntoView({ duration: 1000 });
    cy.do(currencySelection.open());
    cy.expect(SelectionList().exists());
    cy.then(() => SelectionList().optionList()).then((options) => {
      currencyCodes.forEach((currencyCode) => {
        const isOptionPresent = options.some((option) => option.includes(`(${currencyCode})`));

        expect(isOptionPresent, `Currency option "${currencyCode}" is present`).to.equal(isPresent);
      });
    });
    cy.do(currencySelection.toggle());
  },
  checkExchangeRate(exchangeRate) {
    cy.expect(extendedInfoFields.exchangeRate.has({ value: String(exchangeRate) }));
  },
  verifyAccountingCode(accountingCode) {
    cy.expect(vendorFields.accountingCode.has({ singleValue: including(accountingCode) }));
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
      cy.get('#currency').scrollIntoView({ duration: 1000 });
      cy.do([currencySelection.open(), SelectionList().select(invoice.currency)]);
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
      cy.wait(4000);
      cy.do([
        invoiceAcqUnitsMultiSelect.find(Button({ ariaLabel: 'open menu' })).click(),
        MultiSelectOption(...invoice.acqUnits).click(),
      ]);
      cy.wait(2000);
    }
    if (invoice.adjustment) {
      // Without "index" a new adjustment is added, with "index" an existing one is edited
      const { index, description, value, type, prorate, relationToTotal } = invoice.adjustment;
      const adjustmentIndex = index ?? 0;

      if (index === undefined) {
        cy.do(invoiceEditFormRoot.find(Button({ id: 'adjustments-add-button' })).click());
      }
      if (description) {
        cy.do(
          TextField({ name: `adjustments[${adjustmentIndex}].description` }).fillIn(description),
        );
      }
      if (value) {
        cy.do(TextField({ name: `adjustments[${adjustmentIndex}].value` }).fillIn(value));
      }
      if (type) {
        cy.do(getAdjustmentCard(adjustmentIndex).find(KeyValue('Type')).find(Button(type)).click());
      }
      if (prorate) {
        cy.do(Select({ name: `adjustments[${adjustmentIndex}].prorate` }).choose(prorate));
      }
      if (relationToTotal) {
        cy.do(
          Select({ name: `adjustments[${adjustmentIndex}].relationToTotal` }).choose(
            relationToTotal,
          ),
        );
      }
    }
    if (invoice.deleteAdjustments) {
      // Removes the first N adjustments: remove button #0 is always the first card's trash
      for (let i = 0; i < invoice.deleteAdjustments; i++) {
        cy.do(adjustmentsField.clickRemove(0));
      }
    }
    if (invoice.adjustmentProrate !== undefined) {
      const prorateSelect = invoiceEditFormRoot.find(Select({ name: 'adjustments[0].prorate' }));

      cy.do(prorateSelect.choose(invoice.adjustmentProrate));
      cy.expect(
        invoice.adjustmentProrate === ''
          ? prorateSelect.has({ hasValue: false })
          : prorateSelect.has({ checkedOptionText: invoice.adjustmentProrate }),
      );
    }
    if (invoice.adjustmentRelationToTotal) {
      cy.do(
        invoiceEditFormRoot
          .find(Select({ name: 'adjustments[0].relationToTotal' }))
          .choose(invoice.adjustmentRelationToTotal),
      );
      this.checkAdjustmentRelationToTotal(invoice.adjustmentRelationToTotal);
    }
    if (invoice.addAdjustmentFundDistribution) {
      cy.do(
        invoiceEditFormRoot
          .find(Button({ id: 'adjustments[0].fundDistributions-add-button' }))
          .click(),
      );
      cy.expect(
        invoiceEditFormRoot
          .find(Button({ id: 'adjustments[0].fundDistributions[0].fundId' }))
          .exists(),
      );
    }
    if (invoice.adjustmentFund) {
      const { name, code } = invoice.adjustmentFund;

      cy.do([
        invoiceEditFormRoot
          .find(Button({ id: 'adjustments[0].fundDistributions[0].fundId' }))
          .click(),
        SelectionOption(`${name} (${code})`).click(),
      ]);
      cy.expect(
        invoiceEditFormRoot
          .find(Button({ id: 'adjustments[0].fundDistributions[0].fundId' }))
          .has({ text: including(code) }),
      );
    }
    if (invoice.adjustmentExpenseClass) {
      cy.do([
        adjustmentExpenseClassSelection.open(),
        SelectionList().select(including(invoice.adjustmentExpenseClass)),
      ]);
      this.checkAdjustmentExpenseClass({ selected: invoice.adjustmentExpenseClass });
    }
  },
  uploadFile(fileName) {
    cy.get('input[type=file]', getLongDelay()).attachFile(fileName);
    cy.expect(HTML(including(fileName)).exists());
  },
  deleteDocument(documentName) {
    const invoiceDocument = documentsSection.find(
      HTML({ className: including('row-'), text: documentName }),
    );

    cy.do(invoiceDocument.find(deleteButton).click());
    cy.expect(invoiceDocument.absent());
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

  verifyAcqUnitSelectionDisabled(isDisabled = true) {
    cy.expect(
      invoiceAcqUnitsMultiSelect
        .find(Button({ className: including('multiSelectToggleButton') }))
        .has({ disabled: isDisabled }),
    );
  },

  verifyAcqUnitSelected(auName) {
    cy.expect(invoiceAcqUnitsMultiSelect.find(ValueChipRoot(auName)).exists());
  },

  checkAdjustmentsCount(count) {
    // Adjustment fields are indexed without gaps, so the last index and the next one define the count
    if (count) {
      cy.expect(
        adjustmentsField
          .find(TextField({ name: `adjustments[${count - 1}].description` }))
          .exists(),
      );
    }
    cy.expect(
      adjustmentsField.find(TextField({ name: `adjustments[${count}].description` })).absent(),
    );
  },

  checkAdjustmentSelectOptions(fieldName, { included = [], excluded = [] } = {}, index = 0) {
    const select = invoiceEditFormRoot.find(Select({ name: `adjustments[${index}].${fieldName}` }));

    included.forEach((option) => {
      cy.expect(select.has({ optionsText: including(option) }));
    });
    excluded.forEach((option) => {
      cy.expect(select.has({ optionsText: not(including(option)) }));
    });
  },

  checkAdjustmentRelationToTotal(relationToTotal, index = 0) {
    cy.expect(
      invoiceEditFormRoot
        .find(Select({ name: `adjustments[${index}].relationToTotal` }))
        .has({ checkedOptionText: relationToTotal }),
    );
  },

  checkAdjustmentExpenseClass({ selected, options, error } = {}) {
    if (selected !== undefined) {
      cy.expect(adjustmentExpenseClassSelection.has({ singleValue: selected }));
    }
    if (options) {
      cy.do(adjustmentExpenseClassSelection.open());
      cy.expect(SelectionList().has({ optionCount: options.length }));
      options.forEach((option) => {
        cy.expect(SelectionList().has({ optionList: including(option) }));
      });
      cy.do(adjustmentExpenseClassSelection.toggle());
    }
    if (error) {
      cy.expect(adjustmentExpenseClassSelection.has({ error }));
    }
    if (error === null) {
      cy.expect(
        adjustmentExpenseClassSelection
          .find(HTML({ className: including('feedbackError') }))
          .absent(),
      );
    }
  },

  checkAdjustmentFundDistributionAbsent(index = 0) {
    cy.expect(
      invoiceEditFormRoot
        .find(Button({ id: `adjustments[${index}].fundDistributions[0].fundId` }))
        .absent(),
    );
  },

  clearField(fieldName) {
    if (fieldName === INVOICE_VIEW_FIELDS.VENDOR_NAME) {
      cy.do(vendorFields.vendorName.focus());
      cy.do(vendorFields.vendorName.find(clearButton).click());
    }

    if (fieldName === INVOICE_VIEW_FIELDS.VENDOR_INVOICE_NUMBER) {
      cy.do(vendorFields.vendorInvoiceNo.focus());
      cy.do(vendorFields.vendorInvoiceNo.find(clearButton).click());
    }
  },
};
