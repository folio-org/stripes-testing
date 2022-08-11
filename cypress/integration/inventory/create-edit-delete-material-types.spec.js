import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import SettingsMenu from '../../support/fragments/settingsMenu';
import InventorySettings from '../../support/fragments/inventory/inventorySettings';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import NewMaterialType from '../../support/fragments/settings/inventory/newMaterialType';
import Users from '../../support/fragments/users/users';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-inventory: Create, edit, delete material types', () => {
  let userId;
  const materialTypeName = `autoTestMaterialType.${getRandomPostfix()}`;
  const newMaterialTypeName = `autoTestMaterialType.${getRandomPostfix()}`;

  before(() => {
    cy.createTempUser([permissions.uiCreateEditDeleteMaterialTypes.gui]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password, { path: SettingsMenu.materialTypePath, waiter: MaterialTypes.waitLoading });
    });
  });

  after(() => {
    Users.deleteViaApi(userId);
  });

  it('C505 Settings (Inventory): Create, edit, delete material types (folijet) (prokopovych)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    InventorySettings.checkAvailableOptions();
    NewMaterialType.create(materialTypeName);
    MaterialTypes.checkIsPresented(materialTypeName);
    MaterialTypes.edit(materialTypeName, newMaterialTypeName);
    MaterialTypes.checkIsPresented(newMaterialTypeName);
    MaterialTypes.delete(newMaterialTypeName);
    MaterialTypes.checkIsDeleted(newMaterialTypeName);
    MaterialTypes.verifyMessageOfDeteted(newMaterialTypeName);
  });
});
