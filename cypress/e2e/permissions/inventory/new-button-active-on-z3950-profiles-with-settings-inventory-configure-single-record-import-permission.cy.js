import { Permissions } from '../../../support/dictionary';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Permissions', () => {
  describe('Permissions --> Inventory', () => {
    let userId;
    before('Create user and login', () => {
      cy.createTempUser([Permissions.uiInventorySettingsConfigureSingleRecordImport.gui]).then(
        (userProperties) => {
          userId = userProperties.userId;

          cy.login(userProperties.username, userProperties.password);
          cy.visit(SettingsMenu.targetProfilesPath);
        },
      );
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userId);
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
