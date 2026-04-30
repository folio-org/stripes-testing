import { CURRENCIES, INVOICE_VIEW_FIELDS } from '../../support/constants';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import InvoiceEditForm from '../../support/fragments/invoices/invoiceEditForm';
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
      exchangeRate: '3',
    },
    invoiceLine: {
      subTotal: 20,
    },
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;

      cy.getBatchGroups().then(({ id: batchGroupId }) => {
        Invoices.createInvoiceViaApi({
          vendorId: organizationId,
          batchGroupId,
          accountingCode: testData.organization.erpCode,
        }).then((invoice) => {
          testData.invoice.id = invoice.id;
          testData.invoice.vendorInvoiceNo = invoice.vendorInvoiceNo;

          Invoices.createInvoiceLineViaApi(
            Invoices.getDefaultInvoiceLine({
              invoiceId: invoice.id,
              invoiceLineStatus: invoice.status,
              subTotal: testData.invoiceLine.subTotal,
            }),
          );
        });
      });
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
    Invoices.deleteInvoiceViaApi(testData.invoice.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C436956 "Calculated total amount (Exchanged)" field is populated correctly when user changes invoice currency to non-default (one invoice line exists) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C436956'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: `$${testData.invoiceLine.subTotal}.00` },
        ],
        fieldsNotDisplayed: [INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT_EXCHANGED],
      });
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.fillInvoiceFields({
        currency: CURRENCIES.UZS,
      });
      InvoiceEditForm.checkFieldsConditions([
        {
          label: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT_EXCHANGED,
          conditions: { value: `$${testData.invoiceLine.subTotal}.00` },
        },
      ]);
      InvoiceEditForm.verifyIsExchangeRateChecked(true);
      InvoiceEditForm.verifyIsSetExchangeRateRequired(true);
      InvoiceEditForm.fillInvoiceFields({
        exchangeRate: testData.invoice.exchangeRate,
      });
      InvoiceEditForm.checkFieldsConditions([
        {
          label: INVOICE_VIEW_FIELDS.CALCULATED_TOTAL_AMOUNT_EXCHANGED,
          conditions: {
            value: `$${testData.invoiceLine.subTotal * testData.invoice.exchangeRate}.00`,
          },
        },
      ]);
      InvoiceEditForm.clickSaveButton();
      InvoiceView.waitLoading();
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
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
      });
    },
  );
});
