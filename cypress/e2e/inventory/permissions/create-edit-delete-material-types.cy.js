import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import MigrationData from '../../../support/migrationData';

describe('Inventory', () => {
  describe('Permissions', () => {
    const userData = {};
    const materialTypeName = `C505 autoTestMaterialType.${getRandomPostfix()}`;
    const newMaterialTypeName = `C505 autoTestMaterialType.${getRandomPostfix()}`;

    before('Create test user and login', () => {
      cy.getAdminToken();
      cy.then(() => {
        if (Cypress.env('migrationTest')) {
          Users.getUsers({
            limit: 500,
            query: `username="${MigrationData.getUsername('C505')}"`,
          }).then((users) => {
            userData.username = users[0].username;
            userData.password = MigrationData.password;
          });
        } else {
          cy.createTempUser([Permissions.uiCreateEditDeleteMaterialTypes.gui]).then(
            (userProperties) => {
              userData.username = userProperties.username;
              userData.password = userProperties.password;
              userData.userId = userProperties.userId;
            },
          );
        }
      }).then(() => {
        cy.login(userData.username, userData.password);
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C505 Settings (Inventory): Create, edit, delete material types (folijet)',
      { tags: ['smoke', 'folijet', 'shiftLeft', 'C505', 'eurekaPhase1'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.MATERIAL_TYPES);
        MaterialTypes.checkAvailableOptions();
        MaterialTypes.createMaterialType(materialTypeName);
        MaterialTypes.isPresented(materialTypeName);
        MaterialTypes.edit(materialTypeName, newMaterialTypeName);
        MaterialTypes.delete(newMaterialTypeName);
        MaterialTypes.checkIsDeleted(newMaterialTypeName);
        MaterialTypes.verifyMessageOfDeteted(newMaterialTypeName);
      },
    );
  });
});
