import TopMenu from '../../../support/fragments/topMenu';
import NewBatchGroup from '../../../support/fragments/invoices/newBatchGroup';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';
import TestType from '../../../support/dictionary/testTypes';

describe('ui-invoices-settings: Batch Group creation', () => {
  const batchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.settingsInvoice);
  });

  it('C343345 Create and edit Batch groups', { tags: [TestType.smoke] }, () => {
    SettingsInvoices.selectSetting(SettingsInvoices.settings.batchGroups);
    SettingsInvoices.createNewBatchGroup(batchGroup);
    SettingsInvoices.checkBatchGroup(batchGroup);
    batchGroup.name += 'updated';
    batchGroup.description += 'updated';
    SettingsInvoices.editBatchGroup(batchGroup);
    SettingsInvoices.checkBatchGroup(batchGroup);
    SettingsInvoices.deleteBatchGroup(batchGroup);
  });
});
