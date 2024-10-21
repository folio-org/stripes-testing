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
        'HD1691.I51968',
        '  HD1691.I51968',
        'HD1691.I51968  ',
        'HD1691.  I51968',
        '  HD  1691  .I51968  ',
      ],
      searchResults: [
        'C466153 Search by Classification Instance (space checks) - Instance 1 (no spaces)',
        'C466153 Search by Classification Instance (space checks) - Instance 2 (leading spaces)',
        'C466153 Search by Classification Instance (space checks) - Instance 3 (trailing spaces)',
        'C466153 Search by Classification Instance (space checks) - Instance 4 (internal spaces)',
        'C466153 Search by Classification Instance (space checks) - Instance 5 (spaces everywhere)',
      ],
    };

    const marcFile = {
      marc: 'marcBibFileForC466153.mrc',
      fileName: `testMarcFileC466153.${getRandomPostfix()}.mrc`,
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
      'C466153 Search by "Classification, normalized" search option using queries with spaces (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C466153'] },
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
