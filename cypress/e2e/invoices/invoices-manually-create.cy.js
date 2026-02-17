import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';

describe(
  'Invoices',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    let invoice;
    let vendorPrimaryAddress;

    beforeEach(() => {
      invoice = { ...NewInvoice.defaultUiInvoice };
      vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
      cy.getAdminToken();
      Organizations.getOrganizationViaApi({ query: `name=${invoice.vendorName}` }).then(
        (organization) => {
          invoice.accountingCode = organization.erpCode;
          Object.assign(
            vendorPrimaryAddress,
            organization.addresses.find((address) => address.isPrimary === true),
          );
        },
      );
      cy.getBatchGroups().then((batchGroup) => {
        invoice.batchGroup = batchGroup.name;
      });
      cy.waitForAuthRefresh(() => {
        cy.loginAsAdmin({ path: TopMenu.invoicesPath, waiter: Invoices.waitLoading });
      }, 20_000);
    });

    it(
      'C2299 Manually Create Invoice (thunderjet)',
      { tags: ['smoke', 'thunderjet', 'C2299', 'shiftLeft'] },
      () => {
        Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
        Invoices.checkCreatedInvoice(invoice, vendorPrimaryAddress);
        Invoices.deleteInvoiceViaActions();
        Invoices.confirmInvoiceDeletion();
      },
    );
  },
);
