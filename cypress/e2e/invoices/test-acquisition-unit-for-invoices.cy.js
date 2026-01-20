import permissions from '../../support/dictionary/permissions';
import { Invoices, NewInvoice } from '../../support/fragments/invoices';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import Organizations from '../../support/fragments/organizations/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  let user;

  before(() => {
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

    cy.createTempUser([
      permissions.invoiceSettingsAll.gui,
      permissions.uiInvoicesCancelInvoices.gui,
      permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.uiInvoicesDownloadBatchFileFromInvoiceRecord.gui,
      permissions.uiInvoicesExportSearchResults.gui,
      permissions.uiInvoicesManageAcquisitionUnits.gui,
      permissions.uiInvoicesVoucherExport.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    AcquisitionUnits.getAcquisitionUnitViaApi({
      query: `"name"="${defaultAcquisitionUnit.name}"`,
    }).then((response) => {
      AcquisitionUnits.deleteAcquisitionUnitViaApi(response.acquisitionsUnits[0].id);
    });
  });

  it(
    'C163930 Test acquisition unit restrictions for Invoice records (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C163930'] },
    () => {
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
        authRefresh: true,
      });
      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInInfo(defaultAcquisitionUnit.name);
      // Need to wait,while data is load
      cy.wait(2000);
      AcquisitionUnits.assignUser(user.username);

      cy.login(user.username, user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
        authRefresh: true,
      });
      Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);

      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
        authRefresh: true,
      });
      AcquisitionUnits.unAssignUser(user.username, defaultAcquisitionUnit.name);

      cy.login(user.username, user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
        authRefresh: true,
      });
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.checkZeroSearchResultsHeader();

      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
        authRefresh: true,
      }).then(() => {
        AcquisitionUnits.edit(defaultAcquisitionUnit.name);
        AcquisitionUnits.selectViewCheckbox();
      });

      cy.login(user.username, user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
        authRefresh: true,
      });
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
    },
  );
});
