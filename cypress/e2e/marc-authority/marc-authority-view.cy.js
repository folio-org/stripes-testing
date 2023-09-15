import TestTypes from '../../support/dictionary/testTypes';
import Features from '../../support/dictionary/features';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../support/fragments/data_import/dataImport';
import Parallelization from '../../support/dictionary/parallelization';

describe('MARC Authority management', () => {
  const userData = {};
  let instanceID;

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      Permissions.inventoryAll.gui,
    ]).then((createdUserProperties) => {
      userData.id = createdUserProperties.userId;
      userData.firstName = createdUserProperties.firstName;
      userData.name = createdUserProperties.username;
      userData.password = createdUserProperties.password;

      cy.loginAsAdmin();
      DataImport.uploadMarcBib();
    });
  });

  after('Deleting created user', () => {
    Users.deleteViaApi(userData.id);

    InventoryInstance.deleteInstanceViaApi(instanceID);
  });

  it(
    'C350967 quickMARC: View MARC bibliographic record (spitfire)',
    { tags: [TestTypes.smoke, Features.authority, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      cy.login(userData.name, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstances.searchBySource('MARC');
      InventoryInstances.selectInstance();
      InventoryInstance.getId().then((id) => {
        instanceID = id;
      });
      InventoryInstance.checkExpectedMARCSource();
      // Wait for the content to be loaded.
      cy.wait(2000);
      InventoryInstance.checkMARCSourceAtNewPane();
    },
  );
});
