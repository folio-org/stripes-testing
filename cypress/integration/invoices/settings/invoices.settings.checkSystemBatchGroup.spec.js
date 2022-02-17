import TopMenu from '../../../support/fragments/topMenu';
import NewBatchGroup from '../../../support/fragments/invoices/newBatchGroup';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';
import TestType from '../../../support/dictionary/testTypes';

describe('ui-invoices-settings: System Batch Group deletion', () => {
  const batchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
  const systemBatchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
  const systemBatchGroupName = 'FOLIO';
  const systemBatchGroupDescription = 'System default';
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(`${TopMenu.settingsInvoice}${SettingsInvoices.settingsInvoicePath.batchGroups}`);
  });

  it('C10938 FOLIO Batch group is created by system and can only be edited', { tags: [TestType.smoke] }, () => {
    systemBatchGroup.name = systemBatchGroupName;
    systemBatchGroup.description = systemBatchGroupDescription;
    SettingsInvoices.waitBatchGroupsLoading();
    SettingsInvoices.checkThatSystemBatchGroupCantBeDeleted(systemBatchGroupName);
    SettingsInvoices.editBatchGroup(batchGroup, systemBatchGroupName);
    SettingsInvoices.checkBatchGroup(batchGroup);
    SettingsInvoices.checkThatSystemBatchGroupCantBeDeleted(batchGroup.name);
    // revert changes in system batch group
    SettingsInvoices.editBatchGroup(systemBatchGroup, batchGroup.name);
    SettingsInvoices.checkBatchGroup(systemBatchGroup);
  });
});
