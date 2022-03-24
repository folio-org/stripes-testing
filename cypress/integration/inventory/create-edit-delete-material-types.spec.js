import uuid from 'uuid';
import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import SettingsMenu from '../../support/fragments/settingsMenu';
import getRandomPostfix from '../../support/utils/stringTools';

describe('ui-inventory: Create, edit, delete material types', () => {
  let userId = '';
  const materialTypeId = uuid;

  const materialTypeName = `autoTestMaterialType.${getRandomPostfix()}`;

  const materialType = {
    id: materialTypeId,
    name: materialTypeName,
    source: 'local',
  };

  beforeEach(() => {
    cy.createTempUser(permissions.uiCreateEditDeleteMaterialTypes.gui).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.eholdingsPath);
    });

    cy.createMaterialTypeApi({
      ...materialType
    });
  });

  afterEach(() => {
    cy.deleteMaterialTypeApi(materialType.id);
  });

  it('C505 Settings (Inventory): Create, edit, delete material types', { tags: [TestTypes.smoke] }, () => {
    cy.visit(SettingsMenu.materialTypePath);
  });
});

