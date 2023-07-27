import NewBatchGroup from '../../../support/fragments/invoices/newBatchGroup';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';
import TestType from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import devTeams from '../../../support/dictionary/devTeams';

describe('Invoices: Settings (Invoices)', () => {
  const batchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
  const newBatchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(`${SettingsMenu.invoiceBatchGroupsPath}`);
  });

  it('C10939 Configure batch group settings (thunderjet)', { tags: [TestType.criticalPath, devTeams.thunderjet] }, () => {
    SettingsInvoices.waitBatchGroupsLoading();
    SettingsInvoices.createNewBatchGroup(batchGroup);
    SettingsInvoices.checkBatchGroup(batchGroup);
    newBatchGroup.name += 'updated';
    newBatchGroup.description += 'updated';
    SettingsInvoices.editBatchGroup(newBatchGroup, batchGroup.name);
    SettingsInvoices.checkBatchGroup(newBatchGroup);
    SettingsInvoices.deleteBatchGroup(newBatchGroup);
  });
});
