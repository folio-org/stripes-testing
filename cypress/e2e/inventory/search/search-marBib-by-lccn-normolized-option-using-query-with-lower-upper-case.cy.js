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
      lccnSearchQueries: [
        'n678345671',
        'N678345671',
        'n 678345671',
        'N 678345671',
        '  n  678345671  ',
        '  N  678345671  ',
      ],
      searchResults: [
        'C442820 Test upper case LCCN normalized Sz record 1 (one space internal)',
        'C442820 Test upper case LCCN normalized Sz record 2 (two spaces internal)',
        'C442820 Test upper case LCCN normalized Sz record 3 (one space leading)',
        'C442820 Test upper case LCCN normalized Sz record 4 (two spaces leading)',
        'C442820 Test upper case LCCN normalized Sz record 5 (two spaces everywhere)',
        'C442820 Test upper case LCCN normalized Sz record 6 (no spaces)',
        'C442820 Test lower case LCCN normalized Sz record 1 (one space internal)',
        'C442820 Test lower case LCCN normalized Sz record 2 (two spaces internal)',
        'C442820 Test lower case LCCN normalized Sz record 3 (one space leading)',
        'C442820 Test lower case LCCN normalized Sz record 4 (two spaces leading)',
        'C442820 Test lower case LCCN normalized Sz record 5 (two spaces everywhere)',
        'C442820 Test lower case LCCN normalized Sz record 6 (no spaces)',
      ],
    };
    // create an array of file names
    const mrkFiles = Array.from({ length: 12 }, (_, i) => `marcBibFileForC442820_${i + 1}.mrk`);
    const createdRecordIDs = [];

    before(() => {
      cy.getAdminToken();
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
      'C442820 Search for "MARC bibliographic" by "LCCN, normalized" option using a query with lower, UPPER case when "LCCN" (010 $z) has (leading, internal, trailing) spaces. (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire'] },
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
