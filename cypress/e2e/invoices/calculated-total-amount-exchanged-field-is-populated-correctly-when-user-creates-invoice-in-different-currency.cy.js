/* eslint-disable no-irregular-whitespace */
import DateTools from '../../support/utils/dateTools';
import {
  CURRENCIES,
  INVOICE_BATCH_GROUPS,
  INVOICE_PAYMENT_METHODS,
  INVOICE_VIEW_FIELDS,
} from '../../support/constants';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import InvoiceEditForm from '../../support/fragments/invoices/invoiceEditForm';
import InvoiceLineEditForm from '../../support/fragments/invoices/invoiceLineEditForm';
import getRandomPostfix from '../../support/utils/stringTools';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const testData = {
    organization: {
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    },
    invoice: {
      invoiceDate: DateTools.getCurrentDate(),
      batchGroup: INVOICE_BATCH_GROUPS.FOLIO,
      vendorInvoiceNumber: `autotest_${getRandomPostfix()}`,
      paymentMethod: INVOICE_PAYMENT_METHODS.CASH,
      currency: CURRENCIES.UZS,
      exchangeRate: '3',
    },
    invoiceLine: {
      description: `autotest_description_${getRandomPostfix()}`,
      quantity: '1',
      subTotal: '20',
    },
    createdInvoice: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });

    cy.createTempUser([Permissions.viewEditCreateInvoiceInvoiceLine.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    if (testData.createdInvoice.id) {
      Invoices.deleteInvoiceViaApi(testData.createdInvoice.id);
    }
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C436952 "Calculated total amount (Exchanged)" field is populated correctly when user creates invoice in different currency (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C436952'] },
    () => {
      Invoices.openInvoiceEditForm({ createNew: true });
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
        vendorInvoiceNo: testData.invoice.vendorInvoiceNumber,
        vendorName: testData.organization.name,
        batchGroupName: testData.invoice.batchGroup,
        currency: testData.invoice.currency,
        paymentMethod: testData.invoice.paymentMethod,
      });
      InvoiceEditForm.verifyIsExchangeRateChecked(true);
      InvoiceEditForm.verifyIsSetExchangeRateRequired(true);
      InvoiceEditForm.fillInvoiceFields({
        exchangeRate: testData.invoice.exchangeRate,
      });
      InvoiceEditForm.clickSaveButton();
      InvoiceView.waitLoading();
      cy.url().then((url) => {
        testData.createdInvoice.id = url.match(/invoice\/view\/([^/]+)/)?.[1] || null;
      });
      InvoiceView.openInvoiceLineEditForm();
      InvoiceLineEditForm.fillInvoiceLineFields(testData.invoiceLine);
      InvoiceLineEditForm.clickSaveButton();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNumber,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.BATCH_GROUP, value: testData.invoice.batchGroup },
          {
            key: INVOICE_VIEW_FIELDS.SUB_TOTAL,
            value: `UZS ${testData.invoiceLine.subTotal}.00`,
          },
          {
            key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT,
            value: `UZS ${testData.invoiceLine.subTotal}.00`,
          },
          {
            key: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT_EXCHANGED,
            value: `$${testData.invoiceLine.subTotal * testData.invoice.exchangeRate}.00`,
          },
        ],
        invoiceLines: [
          {
            description: testData.invoiceLine.description,
            quantity: testData.invoiceLine.quantity,
            subTotal: `UZS ${testData.invoiceLine.subTotal}.00`, // Non-breaking space is needed here
            total: `UZS ${testData.invoiceLine.subTotal}.00`, // Non-breaking space is needed here
            totalExchanged: `$${testData.invoiceLine.subTotal * testData.invoice.exchangeRate}.00`,
          },
        ],
      });
    },
  );
});
