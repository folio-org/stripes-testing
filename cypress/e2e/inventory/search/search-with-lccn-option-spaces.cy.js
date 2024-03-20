import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';

describe('inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      lccnOption: 'LCCN, normalized',
      lccnSearchQueries: [
        'n79021425440126',
        '  n  79021425440126 ',
        'n 79021425440126',
        'n  79021425440126',
        'n79021425440126 ',
        'n79021425440126  ',
        ' n79021425440126',
        '  n79021425440126',
        '  n  79021425440126  ',
      ],
      searchResults: [
        'Test LCCN normalized C440126Auto record 1 (two leading spaces, one trailing space, two internal spaces)',
        'Test LCCN normalized C440126Auto record 2 (one space internal)',
        'Test LCCN normalized C440126Auto record 3 (two spaces internal)',
        'Test LCCN normalized C440126Auto record 4 (one space trailing)',
        'Test LCCN normalized C440126Auto record 5 (two spaces trailing)',
        'Test LCCN normalized C440126Auto record 6 (one space leading)',
        'Test LCCN normalized C440126Auto record 7 (two spaces leading)',
        'Test LCCN normalized C440126Auto record 8 (two spaces everywhere)',
        'Test LCCN normalized C440126Auto record 9 (no spaces)',
      ],
    };

    const marcFile = {
      marc: 'marcBibFileC440126.mrc',
      fileName: `testMarcFileC440126.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    before(() => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
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
      'C440126 Search for "MARC bibliographic" by "LCCN, normalized" option when "LCCN" (010 $a) has (leading, internal, trailing) spaces. (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'eurekaPhase1'] },
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
