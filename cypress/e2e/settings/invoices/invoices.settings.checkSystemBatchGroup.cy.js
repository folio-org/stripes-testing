import NewBatchGroup from '../../../support/fragments/invoices/newBatchGroup';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('ui-invoices-settings: System Batch Group deletion', () => {
  const batchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
  const systemBatchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
  const systemBatchGroupName = 'FOLIO';
  const systemBatchGroupDescription = 'System default';
  before(() => {
    cy.loginAsAdmin({
      path: SettingsMenu.invoiceBatchGroupsPath,
      waiter: SettingsInvoices.waitBatchGroupsLoading,
      authRefresh: true,
    }).then(() => {
      cy.getAdminSourceRecord().then((adminSourceRecord) => {
        batchGroup.source = adminSourceRecord;
        systemBatchGroup.source = adminSourceRecord;
      });
    });
  });

  after('Revert FOLIO batch group values to default', () => {
    cy.getBatchGroups({ query: `name="${systemBatchGroup.name}"` }).then((group) => {
      if (group) {
        cy.updateBatchGroup(group.id, systemBatchGroupName, systemBatchGroupDescription);
      }
    });
  });

  it(
    'C10938 FOLIO Batch group is created by system and can only be edited (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'C10938'] },
    () => {
      systemBatchGroup.name = systemBatchGroupName;
      systemBatchGroup.description = systemBatchGroupDescription;

      SettingsInvoices.waitBatchGroupsLoading();
      SettingsInvoices.checkNotDeletingGroup(systemBatchGroupName);
      SettingsInvoices.editBatchGroup(batchGroup, systemBatchGroupName);
      SettingsInvoices.checkBatchGroup(batchGroup, systemBatchGroup.source);
      SettingsInvoices.checkNotDeletingGroup(batchGroup.name);
      // revert changes in system batch group
      SettingsInvoices.editBatchGroup(systemBatchGroup, batchGroup.name);
      SettingsInvoices.checkBatchGroup(systemBatchGroup, systemBatchGroup.source);
    },
  );
});
