import getRandomPostfix from '../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import SettingsMenu from '../../support/fragments/settingsMenu';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import NewMaterialType from '../../support/fragments/settings/inventory/newMaterialType';
import Users from '../../support/fragments/users/users';

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
      Users.deleteViaApi(userId);
    });

    it(
      'C505 Settings (Inventory): Create, edit, delete material types (folijet) (prokopovych)',
      { tags: [TestTypes.smoke, DevTeams.folijet] },
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
