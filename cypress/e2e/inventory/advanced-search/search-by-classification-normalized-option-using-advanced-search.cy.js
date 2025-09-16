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
      classificationNormalized: 'Classification, normalized',
    };

    const marcFile = {
      marc: 'marcBibFileForC466155.mrc',
      fileName: `testMarcFileC466155.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const searchData = [
      {
        row: 0,
        query: 'WA 675 I61w 1967',
        matchOption: 'Exact phrase',
      },
      {
        row: 0,
        query: 'WA 675 I61w 1967',
        matchOption: 'Contains all',
      },
      {
        row: 0,
        query: 'WA 675',
        matchOption: 'Starts with',
      },
      {
        row: 0,
        query: '675 I61w',
        matchOption: 'Contains any',
      },
    ];

    const searchDataWithOperator = [
      {
        row: 1,
        query: 'WA I61w 1967',
        matchOption: 'Exact phrase',
      },
      {
        row: 2,
        query: '675 I61w',
        matchOption: 'Contains any',
        operator: 'OR',
      },
      {
        row: 3,
        query: 'wa',
        matchOption: 'Starts with',
        operator: 'AND',
      },
      {
        row: 4,
        query: '1967-2024',
        matchOption: 'Contains all',
        operator: 'NOT',
      },
    ];

    const searchResults = [
      'C466155 Search by Classification Instance (advanced search) - Instance 1 (Dewey)',
      'C466155 Search by Classification Instance (advanced search) - Instance 2 (GDC)',
      'C466155 Search by Classification Instance (advanced search) - Instance 3 (LC)',
      'C466155 Search by Classification Instance (advanced search) - Instance 4 (NLM)',
      'C466155 Search by Classification Instance (advanced search) - Instance 5 (UDC)',
    ];

    const search = (index) => {
      InventoryInstances.clickAdvSearchButton();
      InventoryInstances.fillAdvSearchRow(
        searchData[index].row,
        searchData[index].query,
        searchData[index].matchOption,
        testData.classificationNormalized,
      );
      InventoryInstances.clickSearchBtnInAdvSearchModal();
    };

    const createdRecordIDs = [];

    before(() => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;

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
      'C466155 Search for "Instance" by "Classification, normalized" option using "Advanced search" modal (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466155'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.selectSearchOption(testData.classificationNormalized);
        search(0);
        InventorySearchAndFilter.verifySearchResultIncludingValue(searchResults[0]);
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
            testData.classificationNormalized,
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
