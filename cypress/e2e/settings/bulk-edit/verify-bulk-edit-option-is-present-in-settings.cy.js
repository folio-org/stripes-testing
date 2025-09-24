import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../../support/constants';
import BulkEditPane from '../../../support/fragments/settings/bulk-edit/bulkEditPane';

let user;

describe('Bulk edit', () => {
  describe('Profiles', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditSettingsView.gui,
        Permissions.bulkEditSettingsCreate.gui,
        Permissions.bulkEditSettingsDelete.gui,
        Permissions.bulkEditSettingsLockEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C740198 Verify "Bulk edit" option is present in Settings (firebird)',
      { tags: ['smoke', 'firebird', 'C740198'] },
      () => {
        // Step 1: Navigate to Settings
        TopMenuNavigation.verifyNavigationItemAbsentOnTheBar(APPLICATION_NAMES.BULK_EDIT);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsPane.waitLoading();

        // Step 2: Verify Settings page is opened
        SettingsPane.waitSettingsPaneLoading();

        // Step 3: Verify "Bulk edit" option is present in the left menu
        SettingsPane.checkOptionInSecondPaneExists(APPLICATION_NAMES.BULK_EDIT);

        // Step 4: Click on "Bulk edit" option
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
        BulkEditPane.waitLoading();
        BulkEditPane.verifyBulkEditPaneIsEmpty();
      },
    );
  });
});
