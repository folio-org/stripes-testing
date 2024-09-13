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
    const marcFile = {
      marc: 'marcBibFileForC442820.mrc',
      fileName: `testMarcFileC442820.${getRandomPostfix()}.mrc`,
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
