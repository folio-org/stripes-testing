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
        'sh766384',
        '  sh  766384 ',
        'sh 766384',
        'sh  766384',
        'sh766384 ',
        'sh766384  ',
        ' sh766384',
        '  sh766384',
        '  sh  766384  ',
      ],
      searchResults: [
        'C442817 Test LCCN Sz normalized record 1 (two leading spaces, one trailing space, two internal spaces)',
        'C442817 Test LCCN normalized Sz record 2 (one space internal)',
        'C442817 Test LCCN normalized Sz record 3 (two spaces internal)',
        'C442817 Test LCCN normalized Sz record 4 (one space trailing)',
        'C442817 Test LCCN normalized Sz record 5 (two spaces trailing)',
        'C442817 Test LCCN normalized Sz record 6 (one space leading)',
        'C442817 Test LCCN normalized Sz record 7 (two spaces leading)',
        'C442817 Test LCCN normalized Sz record 8 (two spaces everywhere)',
        'C442817 Test LCCN normalized Sz record 9 (no spaces)',
      ],
    };
    const marcFile = {
      marc: 'marcBibFileForC442817.mrc',
      fileName: `testMarcFileC442817.${getRandomPostfix()}.mrc`,
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
      'C442817 Search for "MARC bibliographic" by "LCCN, normalized" option when "LCCN" (010 $z) has (leading, internal, trailing) spaces. (spitfire)',
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