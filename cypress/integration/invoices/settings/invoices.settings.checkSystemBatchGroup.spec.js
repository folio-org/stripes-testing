import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewBatchGroup from '../../../support/fragments/invoices/newBatchGroup';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';
import TestType from '../../../support/dictionary/testTypes';

describe('ui-invoices-settings: System Batch Group deletion', () => {
  const batchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
  const systemBatchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
  const systemBatchGroupName = '000autotest_group_442.8974220083648736';
  const systemBatchGroupDescription = 'System default';
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(`${SettingsMenu.invoiceBatchGroupsPath}`);
  });

  it('C10938 FOLIO Batch group is created by system and can only be edited', { tags: [TestType.smoke] }, () => {
    systemBatchGroup.name = systemBatchGroupName;
    systemBatchGroup.description = systemBatchGroupDescription;
    SettingsInvoices.waitBatchGroupsLoading();
    SettingsInvoices.checkNotDeletingGroup(systemBatchGroupName);
    SettingsInvoices.editBatchGroup(batchGroup, systemBatchGroupName);
    SettingsInvoices.checkBatchGroup(batchGroup);
    SettingsInvoices.checkNotDeletingGroup(batchGroup.name);
    // revert changes in system batch group
    SettingsInvoices.editBatchGroup(systemBatchGroup, batchGroup.name);
    SettingsInvoices.checkBatchGroup(systemBatchGroup);
  });
});
