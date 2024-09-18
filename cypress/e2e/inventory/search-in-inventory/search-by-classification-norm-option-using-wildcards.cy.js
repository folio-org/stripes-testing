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
      searchQueries: ['*92 .I6 1961', 'hd1692 .I6 *'],
      searchResult: 'C466152 Search by Classification Instance (wildcards) - LC',
    };

    const marcFile = {
      marc: 'marcBibFileForC466152.mrc',
      fileName: `testMarcFileC466152.${getRandomPostfix()}.mrc`,
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
      'C466152 Search by "Classification, normalized" search option using wildcards (truncation) (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        testData.searchQueries.forEach((query) => {
          InventorySearchAndFilter.selectSearchOption(testData.classificationOption);
          InventorySearchAndFilter.executeSearch(query);
          InventorySearchAndFilter.verifySearchResultIncludingValue(testData.searchResult);
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        });
      },
    );
  });
});
