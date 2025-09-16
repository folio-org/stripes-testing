import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const testData = {
      placeOfPublication: 'Place of publication',
    };

    const marcFile = {
      marc: 'marcBibFileForC496183.mrc',
      fileName: `testMarcFileC496183.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const searchData = [
      {
        row: 0,
        query: 'NYauto, Newauto-Yorkauto, Street',
        matchOption: 'Exact phrase',
      },
      {
        row: 0,
        query: 'NYauto, Newauto-Yorkauto, 13thauto Street',
        matchOption: 'Contains all',
      },
      {
        row: 0,
        query: 'NYauto, Newauto-Yorkauto',
        matchOption: 'Starts with',
      },
      {
        row: 0,
        query: 'Newauto-Yorkauto, 13thauto',
        matchOption: 'Contains any',
      },
    ];

    const searchDataWithOperator = [
      {
        row: 1,
        query: 'NYauto, Newauto-Yorkauto, Street',
        matchOption: 'Exact phrase',
      },
      {
        row: 2,
        query: 'Newauto-Yorkauto, 13thauto',
        matchOption: 'Contains any',
        operator: 'OR',
      },
      {
        row: 3,
        query: 'nyauto',
        matchOption: 'Starts with',
        operator: 'AND',
      },
      {
        row: 4,
        query: 'Street, Bronxauto',
        matchOption: 'Contains all',
        operator: 'NOT',
      },
    ];

    const searchResults = [
      'C496183 Search by Place of publication (advanced search) - Instance 1',
      'C496183 Search by Place of publication (advanced search) - Instance 2',
      'C496183 Search by Place of publication (advanced search) - Instance 3',
      'C496183 Search by Place of publication (advanced search) - Instance 4',
      'C496183 Search by Place of publication (advanced search) - Instance 5',
    ];

    const search = (index) => {
      InventoryInstances.clickAdvSearchButton();
      InventoryInstances.fillAdvSearchRow(
        searchData[index].row,
        searchData[index].query,
        searchData[index].matchOption,
        testData.placeOfPublication,
      );
      InventoryInstances.clickSearchBtnInAdvSearchModal();
    };

    const createdRecordIDs = [];

    before(() => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.getUserToken(testData.user.username, testData.user.password);
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        });
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C496183 Search for Instance by "Place of publication" search option using "Advanced search" modal (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C496183'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.selectSearchOption(testData.placeOfPublication);
        search(0);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[3]);
        search(1);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[0]);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[1]);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[2]);
        search(2);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[0]);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[1]);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[3]);
        search(3);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[0]);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[1]);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[2]);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[3]);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[4]);

        InventoryInstances.clickAdvSearchButton();
        searchDataWithOperator.forEach((data) => {
          InventoryInstances.fillAdvSearchRow(
            data.row,
            data.query,
            data.matchOption,
            testData.placeOfPublication,
            data.operator,
          );
        });
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[0]);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[3]);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[4]);
      },
    );
  });
});
