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
      lccnOption: 'LCCN, normalized',
    };

    const marcFile = {
      marc: 'marcBibFileForC451455.mrc',
      fileName: `testMarcFileC451455.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const searchDataFirstRow = {
      row: 0,
      query: 'n79021425',
      matchOption: 'Exact phrase',
    };

    const searchData = [
      {
        row: 1,
        query: '  n  79021425  ',
        matchOption: 'Exact phrase',
        operator: 'AND',
      },
      {
        row: 2,
        query: '79021425',
        matchOption: 'Contains all',
        operator: 'AND',
      },
      {
        row: 3,
        query: 'N7902',
        matchOption: 'Starts with',
        operator: 'AND',
      },
      {
        row: 4,
        query: '7902142',
        matchOption: 'Contains any',
        operator: 'AND',
      },
    ];

    const searchResults = [
      'C451455 Test LCCN normalized record 1 (two leading spaces, one trailing space, two internal spaces)',
      'C451455 Test LCCN normalized record 2 (one space internal)',
      'C451455 Test LCCN normalized record 3 (two spaces internal)',
      'C451455 Test LCCN normalized record 4 (one space trailing)',
      'C451455 Test LCCN normalized record 5 (two spaces trailing)',
      'C451455 Test LCCN normalized record 6 (one space leading)',
      'C451455 Test LCCN normalized record 7 (two spaces leading)',
      'C451455 Test LCCN normalized record 8 (two spaces everywhere)',
      'C451455 Test LCCN normalized record 9 (no spaces)',
    ];

    const createdRecordIDs = [];

    before(() => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
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
      'C451455 Search for "MARC bibliographic" by "LCCN, normalized" option using "Advanced search" modal ($a only) (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C451455'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          searchDataFirstRow.row,
          searchDataFirstRow.query,
          searchDataFirstRow.matchOption,
          testData.lccnOption,
        );
        searchData.forEach((data) => {
          InventoryInstances.fillAdvSearchRow(
            data.row,
            data.query,
            data.matchOption,
            testData.lccnOption,
            data.operator,
          );
        });
        InventoryInstances.checkAdvSearchModalValues(
          searchDataFirstRow.row,
          searchDataFirstRow.query,
          searchDataFirstRow.matchOption,
          testData.lccnOption,
        );
        searchData.forEach((data) => {
          InventoryInstances.checkAdvSearchModalValues(
            data.row,
            data.query,
            data.matchOption,
            testData.lccnOption,
            data.operator,
          );
        });
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        searchResults.forEach((expectedResult) => {
          InventorySearchAndFilter.verifySearchResult(expectedResult);
        });
      },
    );
  });
});
