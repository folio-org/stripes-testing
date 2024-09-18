import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      lccnOption: 'LCCN, normalized',
      lccnSearchQueries: ['n  79021*', '*21425', '*90214*'],
      searchResults: [
        'C440128 Test LCCN normalized record 1 (two leading spaces, one trailing space, two internal spaces)',
        'C440128 Test LCCN normalized record 2 (one space internal)',
        'C440128 Test LCCN normalized record 3 (two spaces internal)',
        'C440128 Test LCCN normalized record 4 (one space trailing)',
        'C440128 Test LCCN normalized record 5 (two spaces trailing)',
        'C440128 Test LCCN normalized record 6 (one space leading)',
        'C440128 Test LCCN normalized record 7 (two spaces leading)',
        'C440128 Test LCCN normalized record 8 (two spaces everywhere)',
        'C440128 Test LCCN normalized record 9 (no spaces)',
      ],
    };
    const marcFile = {
      marc: 'marcBibFileForC440128.mrc',
      fileName: `testMarcFileC440128.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };
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
      'C440128 Search for "MARC bibliographic" by "LCCN, normalized" option using a query with asterisk when "LCCN" (010 $a) has (leading, internal, trailing) spaces. (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.selectSearchOptions(testData.lccnOption, '');

        testData.lccnSearchQueries.forEach((query) => {
          InventorySearchAndFilter.executeSearch(query);
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          InventorySearchAndFilter.selectSearchOptions(testData.lccnOption, '');
          InventorySearchAndFilter.verifyResultPaneEmpty();
        });
      },
    );
  });
});
