import Permissions from '../../../../support/dictionary/permissions';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../../../support/constants';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Classification browse', () => {
      const classificationBrowseTab = 'Classification browse';
      const classificationTypesTab = 'Classification identifier types';
      let testUser;

      before('Create user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.crudClassificationIdentifierTypes.gui,
        ]).then((userProperties) => {
          testUser = userProperties;
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testUser.userId);
      });

      it(
        'C451640 User without permission "Settings (Inventory): Configure classification browse" cannot see "Settings >> Inventory >> Classification browse" page (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C451640'] },
        () => {
          cy.login(testUser.username, testUser.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.INVENTORY);
          SettingsPane.checkTabPresentInSecondPane(
            APPLICATION_NAMES.INVENTORY,
            classificationTypesTab,
            true,
          );
          SettingsPane.checkTabPresentInSecondPane(
            APPLICATION_NAMES.INVENTORY,
            classificationBrowseTab,
            false,
          );
        },
      );
    });
  });
});
