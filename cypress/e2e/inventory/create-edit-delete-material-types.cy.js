import { Permissions } from '../../support/dictionary';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import NewMaterialType from '../../support/fragments/settings/inventory/newMaterialType';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('inventory', () => {
  describe('Permissions', () => {
    let userId;
    const materialTypeName = `autoTestMaterialType.${getRandomPostfix()}`;
    const newMaterialTypeName = `autoTestMaterialType.${getRandomPostfix()}`;

    before(() => {
      cy.createTempUser([Permissions.uiCreateEditDeleteMaterialTypes.gui]).then(
        (userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password);
        },
      );
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(userId);
    });

    it(
      'C505 Settings (Inventory): Create, edit, delete material types (folijet)',
      { tags: ['smoke', 'folijet'] },
      () => {
        cy.visit(SettingsMenu.materialTypePath);
        MaterialTypes.checkAvailableOptions();
        NewMaterialType.create(materialTypeName);
        MaterialTypes.isPresented(materialTypeName);
        MaterialTypes.edit(materialTypeName, newMaterialTypeName);
        MaterialTypes.delete(newMaterialTypeName);
        MaterialTypes.checkIsDeleted(newMaterialTypeName);
        MaterialTypes.verifyMessageOfDeteted(newMaterialTypeName);
      },
    );
  });
});
