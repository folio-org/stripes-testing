import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import SettingsMenu from '../../support/fragments/settingsMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import InventorySettings from '../../support/fragments/inventory/inventorySettings';
import MaterialTypesPane from '../../support/fragments/inventory/materialType/materialTypesPane';

describe('ui-inventory: Create, edit, delete material types', () => {
  let userId = '';
  const materialTypeName = `autoTestMaterialType.${getRandomPostfix()}`;
  const newMaterialTypeName = `autoTestMaterialType.${getRandomPostfix()}`;

  before(() => {
    cy.createTempUser([permissions.uiCreateEditDeleteMaterialTypes.gui]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(SettingsMenu.inventoryPath);
    });
  });

  after(() => {
    cy.deleteUser(userId);
  });

  it('C505 Settings (Inventory): Create, edit, delete material types', { tags: [TestTypes.smoke] }, () => {
    InventorySettings.checkMaterialTypesMenuOptionIsPresent();
    MaterialTypesPane.createNewMaterialType(materialTypeName);
    MaterialTypesPane.editMaterialType(newMaterialTypeName);
    MaterialTypesPane.deleteMaterialType(newMaterialTypeName);
  });
});

