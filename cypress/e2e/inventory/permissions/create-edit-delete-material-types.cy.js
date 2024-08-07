import { Permissions } from '../../../support/dictionary';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Permissions', () => {
    let userId;
    const materialTypeName = `C505 autoTestMaterialType.${getRandomPostfix()}`;
    const newMaterialTypeName = `C505 autoTestMaterialType.${getRandomPostfix()}`;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.uiCreateEditDeleteMaterialTypes.gui]).then(
        (userProperties) => {
          userId = userProperties.userId;

          cy.login(userProperties.username, userProperties.password);
        },
      );
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userId);
    });

    it(
      'C505 Settings (Inventory): Create, edit, delete material types (folijet)',
      { tags: ['smoke', 'folijet', 'shiftLeft'] },
      () => {
        cy.visit(SettingsMenu.materialTypePath);
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
