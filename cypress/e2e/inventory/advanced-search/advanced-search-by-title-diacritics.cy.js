import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `C471499 Der Preis der Verführungauto ${randomPostfix} : die gesetzliche Schadensersatzklage wegen Ehebruchs in England zwischen 1857 und 1970 / Eike Götz Hosemann.`,
      searchQueryPlain: `C471499 Der Preis der Verfuhrungauto ${randomPostfix}`,
      searchQueryDiacritics: `C471499 Der Preis der Verführungauto ${randomPostfix}`,
      searchOption: 'Title (all)',
      searchModifier: 'Starts with',
    };
    let createdRecordId;

    before('Creating data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('C471499');
      // wait for all records to be deleted
      cy.wait(3000);

      cy.getInstanceTypes({ limit: 1 })
        .then((instanceTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: testData.instanceTitle,
            },
          });
        })
        .then((createdInstanceData) => {
          createdRecordId = createdInstanceData.instanceId;

          cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
            (createdUserProperties) => {
              testData.userProperties = createdUserProperties;
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            },
          );
        });
    });

    after('Deleting data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdRecordId);
    });

    it(
      'C471499 Search for Instance record which has diacritics in title using "Advanced search" modal (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C471499'] },
      () => {
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          testData.searchQueryPlain,
          testData.searchModifier,
          testData.searchOption,
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);

        [testData.searchQueryPlain, testData.searchQueryDiacritics].forEach((query) => {
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventoryInstances.searchByTitle(query);
          InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
        });

        [testData.searchQueryPlain, testData.searchQueryDiacritics].forEach((query) => {
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.searchByParameter(testData.searchOption, query);
          InventorySearchAndFilter.verifySearchResult(testData.instanceTitle);
        });
      },
    );
  });
});
