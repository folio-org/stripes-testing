import Permissions from '../../support/dictionary/permissions';
import { Invoices, InvoiceView } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const organization = {
    ...NewOrganization.getDefaultOrganization(),
    isVendor: true,
    vendorCurrencies: ['DZD'],
  };
  const testData = {
    user: {},
    invoice: {
      invoiceDate: DateTools.getFormattedDate({ date: new Date() }),
      batchGroupName: 'FOLIO',
      vendorInvoiceNo: getRandomPostfix(),
      paymentMethod: 'Cash',
      exchangeRate: '1',
    },
    vendorCurrencieUI: 'Algerian Dinar',
  };

  before('Create test data and login', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((organizationResp) => {
      organization.id = organizationResp;
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
    Users.deleteViaApi(testData.user.userId);
    cy.getInvoiceIdApi({
      query: `vendorInvoiceNo="${testData.invoice.vendorInvoiceNo}"`,
    }).then((id) => cy.deleteInvoiceFromStorageViaApi(id));
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C451451 Non-default currency is transferred to Invoice when Organization-vendor has specified "Vendor currencies" (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C451451'] },
    () => {
      const InvoiceEditForm = Invoices.openInvoiceEditForm({ createNew: true });
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
        batchGroupName: testData.invoice.batchGroupName,
        vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
        vendorName: organization.name,
        paymentMethod: testData.invoice.paymentMethod,
        exchangeRate: testData.invoice.exchangeRate,
      });
      InvoiceEditForm.checkCurrency('Algerian Dinar (DZD)');
      cy.wait(1000);
      InvoiceEditForm.clickSaveButton({ invoiceCreated: true, invoiceLineCreated: false });
      InvoiceView.verifyCurrency(testData.vendorCurrencieUI);
    },
  );
});
