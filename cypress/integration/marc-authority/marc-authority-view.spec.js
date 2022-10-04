import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import Features from '../../support/dictionary/features';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

describe('MARC Authority management', () => {
  const userData = {
    uniqueFileName: `autotestFile.${getRandomPostfix()}.mrc`
  };

  before('Creating user and importing file', () => {
    cy.createTempUser([
      Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      Permissions.inventoryAll.gui,
    ]).then(createdUserProperties => {
      userData.id = createdUserProperties.userId;
      userData.firstName = createdUserProperties.firstName;
      userData.name = createdUserProperties.username;

      cy.login(createdUserProperties.username, createdUserProperties.password);
    });
  });

  after('Deleting created user', () => {
    Users.deleteViaApi(userData.id);
  });

  it('C350967 quickMARC: View MARC bibliographic record (spitfire)', { tags: [TestTypes.smoke, Features.authority, DevTeams.spitfire] }, () => {
    cy.visit(TopMenu.inventoryPath);
    InventoryInstances.searchBySource('MARC');
    InventoryInstances.selectInstance();
    InventoryInstance.checkExpectedMARCSource();
    InventoryInstance.checkActionButtonParam();
  });
});
