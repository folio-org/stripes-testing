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
      lccnSearchQueries: ['sh  7663*', '*66384', '*6638*'],
      searchResults: [
        'C442819 Test LCCN Sz normalized record 1 (two leading spaces, one trailing space, two internal spaces)',
        'C442819 Test LCCN normalized Sz record 2 (one space internal)',
        'C442819 Test LCCN normalized Sz record 3 (two spaces internal)',
        'C442819 Test LCCN normalized Sz record 4 (one space trailing)',
        'C442819 Test LCCN normalized Sz record 5 (two spaces trailing)',
        'C442819 Test LCCN normalized Sz record 6 (one space leading)',
        'C442819 Test LCCN normalized Sz record 7 (two spaces leading)',
        'C442819 Test LCCN normalized Sz record 8 (two spaces everywhere)',
        'C442819 Test LCCN normalized Sz record 9 (no spaces)',
      ],
    };
    // create an array of file names
    const mrkFiles = Array.from({ length: 9 }, (_, i) => `marcBibFileForC442819_${i + 1}.mrk`);
    const createdRecordIDs = [];

    before(() => {
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

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
      'C442819 Search for "MARC bibliographic" by "LCCN, normalized" option using a query with asterisk when "LCCN" (010 $z) has (leading, internal, trailing) spaces. (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.selectSearchOptions(testData.lccnOption, '');

        testData.lccnSearchQueries.forEach((query) => {
          InventorySearchAndFilter.executeSearch(query);
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.selectSearchOptions(testData.lccnOption, '');
        });
      },
    );
  });
});
