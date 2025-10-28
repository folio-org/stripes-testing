import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      user: {},
      searchTerm: 'AT_C844181',
      instanceTitle: `AT_C844181_FolioInstance_${getRandomPostfix()}`,
    };
    const nameForCSVFile = `AT_C844181_Instance_UUIDs_${getRandomPostfix()}.csv`;
    const capabSetsToAssign = [CapabilitySets.uiInventoryInstanceEdit];

    before('Create test data', () => {
      cy.getAdminToken();

      InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
        ({ instanceData }) => {
          testData.instanceId = instanceData.instanceId;
        },
      );

      cy.createTempUser([]).then((createdUserProperties) => {
        testData.user = createdUserProperties;

        cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
    });

    it(
      'C844181 User with "UI-Inventory-Instance-edit" capability can save instances UUID (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C844181'] },
      () => {
        InventoryInstances.searchByTitle(testData.searchTerm);

        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
      },
    );
  });
});
