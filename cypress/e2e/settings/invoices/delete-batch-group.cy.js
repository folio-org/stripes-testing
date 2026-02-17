import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import NewBatchGroup from '../../../support/fragments/invoices/newBatchGroup';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Invoices from '../../../support/fragments/invoices/invoices';
import NewInvoice from '../../../support/fragments/invoices/newInvoice';
import BatchGroups from '../../../support/fragments/settings/invoices/batchGroups';
import SettingsOrganizations from '../../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenu from '../../../support/fragments/topMenu';

describe('ui-invoices-settings: System Batch Group deletion', () => {
  const firstBatchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
  const secondBatchGroup = {
    name: `000autotest_group_${getRandomPostfix()}`,
    description: 'Created by autotest',
  };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const organization = { ...NewOrganization.defaultUiOrganizations };

  let user;
  before(() => {
    cy.getAdminToken();
    BatchGroups.createBatchGroupViaApi(firstBatchGroup).then((response) => {
      invoice.batchGroup = response.name;
    });
    BatchGroups.createBatchGroupViaApi(secondBatchGroup);
    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
      invoice.accountingCode = organization.erpCode;
      cy.loginAsAdmin({
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
      Invoices.createDefaultInvoiceWithoutAddress(invoice);
    });
    cy.createTempUser([permissions.invoiceSettingsAll.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: SettingsMenu.invoiceBatchGroupsPath,
        waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    cy.loginAsAdmin({
      path: TopMenu.invoicesPath,
      waiter: Invoices.waitLoading,
    });
    Invoices.searchByNumber(invoice.invoiceNumber);
    Invoices.selectInvoice(invoice.invoiceNumber);
    Invoices.deleteInvoiceViaActions();
    Invoices.confirmInvoiceDeletion();
    cy.visit(SettingsMenu.invoiceBatchGroupsPath);
    SettingsInvoices.deleteBatchGroup(firstBatchGroup);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C367942 Delete Batch group (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C367942'] },
    () => {
      SettingsInvoices.waitBatchGroupsLoading();
      SettingsInvoices.canNotDeleteBatchGroup(firstBatchGroup);
      SettingsInvoices.deleteBatchGroup(secondBatchGroup);
    },
  );
});
