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
      classificationOption: 'Classification, normalized',
      searchQueries: [
        'L37.s:Oc1/2/991',
        '! L37sOc12991$',
        'L37sOc12991',
        'L37 . s : Oc1 / 2 / 991',
        'L37 s Oc12 991',
      ],
      searchResults: [
        'C466154 Search by Classification Instance (special characters checks) - Instance 1 (special characters without spaces)',
        'C466154 Search by Classification Instance (special characters checks) - Instance 2 (special characters with leading spaces)',
        'C466154 Search by Classification Instance (special characters checks) - Instance 3 (no spaces and special characters)',
        'C466154 Search by Classification Instance (special characters checks) - Instance 4 (special characters with internal spaces)',
        'C466154 Search by Classification Instance (special characters checks) - Instance 5 (only spaces internal)',
      ],
    };

    const marcFile = {
      marc: 'marcBibFileForC466154.mrc',
      fileName: `testMarcFileC466154.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
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
        });
        InventorySearchAndFilter.instanceTabIsDefault();
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
      'C466154 Search by "Classification, normalized" search option using queries with special characters (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466154'] },
      () => {
        testData.searchQueries.forEach((query) => {
          InventorySearchAndFilter.selectSearchOption(testData.classificationOption);
          InventorySearchAndFilter.executeSearch(query);
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResultIncludingValue(expectedResult);
          });
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        });
      },
    );
  });
});
