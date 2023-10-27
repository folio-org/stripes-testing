import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewBatchGroup from '../../../support/fragments/invoices/newBatchGroup';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';
import TestType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import { getAdminSourceRecord } from '../../../support/utils/users';

describe('ui-invoices-settings: System Batch Group deletion', () => {
  const batchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
  const systemBatchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
  const systemBatchGroupName = 'Amherst (AC)';
  const systemBatchGroupDescription = 'Amherst College';
  before(() => {
    cy.getAdminToken();
    getAdminSourceRecord();
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(`${SettingsMenu.invoiceBatchGroupsPath}`);
  });

  it(
    'C10938 FOLIO Batch group is created by system and can only be edited (thunderjet)',
    { tags: [TestType.smoke, devTeams.thunderjet] },
    () => {
      systemBatchGroup.name = systemBatchGroupName;
      systemBatchGroup.description = systemBatchGroupDescription;
      SettingsInvoices.waitBatchGroupsLoading();
      SettingsInvoices.checkNotDeletingGroup(systemBatchGroupName);
      SettingsInvoices.editBatchGroup(batchGroup, systemBatchGroupName);
      batchGroup.source = Cypress.env('adminSourceRecord');
      SettingsInvoices.checkBatchGroup(batchGroup);
      SettingsInvoices.checkNotDeletingGroup(batchGroup.name);
      // revert changes in system batch group
      SettingsInvoices.editBatchGroup(systemBatchGroup, batchGroup.name);
      systemBatchGroup.source = Cypress.env('adminSourceRecord');
      SettingsInvoices.checkBatchGroup(systemBatchGroup);
    },
  );
});
