import { Permissions } from '../../../support/dictionary';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import MigrationData from '../../../support/migrationData';

describe('Permissions', () => {
  describe('Permissions --> Inventory', () => {
    const userData = {};
    before('Create user and login', () => {
      cy.then(() => {
        cy.getAdminToken();
        if (Cypress.env('migrationTest')) {
          Users.getUsers({
            limit: 500,
            query: `username="${MigrationData.getUsername('C494346')}"`,
          }).then((users) => {
            userData.username = users[0].username;
            userData.password = MigrationData.password;
          });
        } else {
          cy.createTempUser([Permissions.uiInventorySettingsConfigureSingleRecordImport.gui]).then(
            (userProperties) => {
              userData.username = userProperties.username;
              userData.password = userProperties.password;
              userData.userId = userProperties.userId;
            },
          );
        }
      }).then(() => {
        cy.login(userData.username, userData.password);
        cy.visit(SettingsMenu.targetProfilesPath);
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C494346 Check that "+ New" button active on Z39.50 profiles with "Settings (Inventory): Configure single-record import" permission (folijet)',
      { tags: ['criticalPath', 'folijet', 'C494346'] },
      () => {
        Z3950TargetProfiles.verifyTargetProfilesListDisplayed();
        Z3950TargetProfiles.verifyNewButtonState();
      },
    );
  });
});
