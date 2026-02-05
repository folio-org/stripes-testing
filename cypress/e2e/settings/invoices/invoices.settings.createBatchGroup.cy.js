import NewBatchGroup from '../../../support/fragments/invoices/newBatchGroup';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('Invoices', () => {
  describe('Settings (Invoices)', () => {
    const batchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
    const newBatchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
    before(() => {
      cy.getAdminToken().then(() => {
        cy.getAdminSourceRecord().then((adminSourceRecord) => {
          newBatchGroup.source = adminSourceRecord;
        });
      });
      cy.loginAsAdmin();
      cy.visit(`${SettingsMenu.invoiceBatchGroupsPath}`);
    });

    it(
      'C343345 Create and edit Batch groups (thunderjet)',
      { tags: ['smoke', 'thunderjet', 'C343345'] },
      () => {
        SettingsInvoices.waitBatchGroupsLoading();
        SettingsInvoices.createNewBatchGroup(batchGroup);
        SettingsInvoices.checkBatchGroup(batchGroup, newBatchGroup.source);
        newBatchGroup.name += 'updated';
        newBatchGroup.description += 'updated';
        SettingsInvoices.editBatchGroup(newBatchGroup, batchGroup.name);
        SettingsInvoices.checkBatchGroup(newBatchGroup, newBatchGroup.source);
        SettingsInvoices.deleteBatchGroup(newBatchGroup);
      },
    );
  });
});
