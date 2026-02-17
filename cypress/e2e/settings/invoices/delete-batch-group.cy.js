import Permissions from '../../../support/dictionary/permissions';
import { Invoices, NewInvoice } from '../../../support/fragments/invoices';
import NewBatchGroup from '../../../support/fragments/invoices/newBatchGroup';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import BatchGroups from '../../../support/fragments/settings/invoices/batchGroups';
import SettingsOrganizations from '../../../support/fragments/settings/organizations/settingsOrganizations';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('ui-invoices-settings: System Batch Group deletion', () => {
  let user;
  const firstBatchGroup = {
    ...NewBatchGroup.defaultUiBatchGroup,
    name: `first_autotest_group_${getRandomPostfix()}`,
  };
  const secondBatchGroup = {
    name: `second_autotest_group_${getRandomPostfix()}`,
    description: 'Created by autotest',
  };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before(() => {
    cy.getAdminToken();
    BatchGroups.createBatchGroupViaApi(firstBatchGroup).then((firstResponse) => {
      invoice.batchGroup = firstResponse.name;
      firstBatchGroup.id = firstResponse.id;

      Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
        organization.id = responseOrganizations;
        invoice.accountingCode = organization.erpCode;
        invoice.vendorId = organization.id;

        Invoices.createInvoiceViaApi(invoice).then((responseInvoice) => {
          invoice.id = responseInvoice.id;
        });
      });
    });
    BatchGroups.createBatchGroupViaApi(secondBatchGroup);

    cy.createTempUser([Permissions.invoiceSettingsAll.gui]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password, {
        path: SettingsMenu.invoiceBatchGroupsPath,
        waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Invoices.deleteInvoiceViaApi(invoice.id);
    BatchGroups.deleteBatchGroupViaApi(firstBatchGroup.id);
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
