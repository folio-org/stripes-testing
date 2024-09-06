import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      lccnOption: 'LCCN, normalized',
      searchQueryWithoutAsteriks: '766384',
      searchQueryWithAsteriks: '*766384',
      searchResultWithoutAsteriks: 'C442818 Test LCCN Sz normalized record 10 (digits only)',
      searchResultsWithAsteriks: [
        'C442818 Test LCCN Sz normalized record 1 (two leading spaces, one trailing space, two internal spaces)',
        'C442818 Test LCCN normalized Sz record 2 (one space internal)',
        'C442818 Test LCCN normalized Sz record 3 (two spaces internal)',
        'C442818 Test LCCN normalized Sz record 4 (one space trailing)',
        'C442818 Test LCCN normalized Sz record 5 (two spaces trailing)',
        'C442818 Test LCCN normalized Sz record 6 (one space leading)',
        'C442818 Test LCCN normalized Sz record 7 (two spaces leading)',
        'C442818 Test LCCN normalized Sz record 8 (two spaces everywhere)',
        'C442818 Test LCCN normalized Sz record 9 (no spaces)',
        'C442818 Test LCCN Sz normalized record 10 (digits only)',
      ],
    };
    // create an array of file names
    const mrkFiles = Array.from({ length: 10 }, (_, i) => `marcBibFileForC442818_${i + 1}.mrk`);
    const createdRecordIDs = [];

    before(() => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.getUserToken(testData.user.username, testData.user.password);
        mrkFiles.forEach((mrkFile) => {
          InventoryInstances.createMarcBibliographicRecordViaApiByReadingFromMrkFile(mrkFile).then(
            (createdMarcBibliographicId) => {
              createdRecordIDs.push(createdMarcBibliographicId);
            },
          );
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
      'C442818 Search for "MARC bibliographic" by "LCCN, normalized" option using a query without prefix (numbers only) when "LCCN" (010 $z) has (leading, internal, trailing) spaces. (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.selectSearchOptions(testData.lccnOption, '');
        InventorySearchAndFilter.executeSearch(testData.searchQueryWithoutAsteriks);
        InventorySearchAndFilter.verifySearchResult(testData.searchResultWithoutAsteriks);
        InventorySearchAndFilter.selectSearchOptions(testData.lccnOption, '');
        InventorySearchAndFilter.executeSearch(testData.searchQueryWithAsteriks);
        testData.searchResultsWithAsteriks.forEach((expectedResult) => {
          InventorySearchAndFilter.verifySearchResult(expectedResult);
        });
      },
    );
  });
});
