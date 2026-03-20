import {
  Button,
  Checkbox,
  Select,
  Selection,
  SelectionList,
  SelectionOption,
  TextField,
  SearchField,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import FinanceHelper from '../finance/financeHelper';
import InvoiceStates from './invoiceStates';

const saveAndClose = Button('Save & close');
const invoiceDateField = TextField('Invoice date*');
const vendorInvoiceNumberField = TextField('Vendor invoice number*');
const batchGroupSelection = Selection('Batch group*');
const invoicePaymentMethodSelect = Select({ id: 'invoice-payment-method' });

const searchOrganization = (vendorName) => {
  cy.do(Button('Organization look-up').click());
  cy.wait(2000);
  cy.expect(SearchField({ id: 'input-record-search' }).exists());
  cy.expect(SearchField({ id: 'input-record-search' }).has({ visible: true }));
  cy.do([SearchField({ id: 'input-record-search' }).fillIn(vendorName), Button('Search').click()]);
  FinanceHelper.selectFromResultsList();
};

export default {
  searchOrganization,
  createInvoice(invoiceData) {
    const {
      status,
      invoiceDate,
      invoiceNumber,
      vendorName,
      accountingCode,
      batchGroup,
      paymentMethod = 'Cash',
      exportToAccounting = false,
      adjustment,
      saveAndContinue = false,
    } = invoiceData;

    cy.do([Selection('Status*').open(), SelectionList().select(status)]);
    if (invoiceDate) {
      cy.do(invoiceDateField.fillIn(invoiceDate));
    }
    if (invoiceNumber) {
      cy.do(vendorInvoiceNumberField.fillIn(invoiceNumber));
    }
    searchOrganization(vendorName);
    if (accountingCode) {
      cy.do([
        Selection('Accounting code').open(),
        SelectionList().select(`Default (${accountingCode})`),
      ]);
    }
    cy.do([
      batchGroupSelection.open(),
      SelectionList().select(batchGroup),
      invoicePaymentMethodSelect.choose(paymentMethod),
    ]);
    if (exportToAccounting) {
      cy.do(Checkbox('Export to accounting').click());
    }
    if (adjustment) {
      const {
        description,
        value,
        type = '%', // '%' or '$'
        prorate,
        relationToTotal,
        exportToAccounting: adjustmentExportToAccounting = false,
        fund,
      } = adjustment;
      cy.do(Button({ id: 'adjustments-add-button' }).click());
      if (description) {
        cy.do(TextField({ name: 'adjustments[0].description' }).fillIn(description));
      }
      if (value) {
        cy.do(TextField({ name: 'adjustments[0].value' }).fillIn(value));
      }
      if (type) {
        cy.do(Button(type).click());
      }
      if (prorate) {
        cy.do(Select({ name: 'adjustments[0].prorate' }).choose(prorate));
      }
      if (relationToTotal) {
        cy.do(Select({ name: 'adjustments[0].relationToTotal' }).choose(relationToTotal));
      }
      if (adjustmentExportToAccounting) {
        cy.do(Checkbox({ name: 'adjustments[0].exportToAccounting' }).click());
      }
      if (fund) {
        cy.do([
          Button({ id: 'adjustments[0].fundDistributions-add-button' }).click(),
          Button({ id: 'adjustments[0].fundDistributions[0].fundId' }).click(),
          SelectionOption(`${fund.name} (${fund.code})`).click(),
        ]);
        cy.wait(3000);
      }
    }
    if (saveAndContinue) {
      cy.do(Button('Save & keep editing').click());
      cy.wait(4000);
    } else {
      cy.do(saveAndClose.click());
    }
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
  },
};
