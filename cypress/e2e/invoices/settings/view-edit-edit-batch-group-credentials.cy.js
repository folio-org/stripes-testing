import Permissions from '../../../support/dictionary/permissions';
import {
  BatchGroupConfigurations,
  BatchGroups,
} from '../../../support/fragments/settings/invoices';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';

describe('Invoices', () => {
  describe('Settings (Invoices)', () => {
    const testData = {
      batchGroup: BatchGroups.getDefaultBatchGroup(),
      batchGroupConfig: BatchGroupConfigurations.getDefaultBatchGroupConfiguration(),
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        BatchGroups.createBatchGroupViaApi(testData.batchGroup);
        BatchGroupConfigurations.createBatchGroupConfigurationViaApi({
          ...testData.batchGroupConfig,
          batchGroupId: testData.batchGroup.id,
          format: 'Application/json',
          uploadDirectory: 'sftp://ftp.ci.folio.org',
        });
      });

      cy.createTempUser([
        Permissions.invoiceSettingsBatchGroupViewEdit.gui,
        Permissions.invoiceSettingsAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsInvoiveApprovalPath,
          waiter: SettingsInvoices.waitApprovalsLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C422074 User is able to view and edit all invoices settings including batch group credentials with "Settings (Invoices): Batch group usernames and passwords: view and edit" permission (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C422074'] },
      () => {
        SettingsInvoices.selectAdjustments();
        SettingsInvoices.checkNewButtonExists();
        SettingsInvoices.selectBatchGroups();
        SettingsInvoices.checkRowActionButtons(testData.batchGroup.name);
        SettingsInvoices.checkNewBatchGroupButtonExists();
        SettingsInvoices.selectBatchGroupConfiguration();
        SettingsInvoices.checkShowCredentialsButton();
        SettingsInvoices.selectBatchGroup(testData.batchGroup.name);
        SettingsInvoices.clickShowCredentialsButton();
        SettingsInvoices.checkVisibilityOfUsernameAndPassword();
        SettingsInvoices.changeUsernameAndPassword('test', 'test');
        SettingsInvoices.clickShowCredentialsButton();
        SettingsInvoices.selectVoucherNumber();
        SettingsInvoices.checkResetSequenceButton();
      },
    );
  });
});
