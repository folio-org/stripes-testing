import Permissions from '../../../support/dictionary/permissions';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      let user;

      const userPermissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        Permissions.dataExportSettingsViewOnly.gui,
      ];

      const marcAuthorityOption = 'MARC authority';
      const softwareVersionsOption = 'Software versions';

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser(userPermissions).then((userProperties) => {
          user = userProperties;
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C424000 User without permission "Settings (MARC authority): View authority files" cannot see "Settings >> MARC authority" page (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C424000'] },
        () => {
          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });

          // Step 1: Verify "MARC authority" section doesn't display on "Settings" pane
          SettingsPane.verifyChooseSettingsIsDisplayed();
          SettingsPane.checkOptionInSecondPaneExists(softwareVersionsOption);
          SettingsPane.checkOptionInSecondPaneExists(marcAuthorityOption, false);
        },
      );
    });
  });
});
