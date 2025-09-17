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
      lccnSearchQuery: 'n766732',
      searchResult: 'C442835 Test LCCN normalized Sa subfield record 1 (with 010 Sa)',
      defaultSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
      containsAll: 'Contains all',
    };

    const marcFile = {
      marc: 'marcBibFileForC442835.mrc',
      fileName: `testMarcFileC442835.${getRandomPostfix()}.mrc`,
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
          authRefresh: true,
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
      'C442835 Verify that "LCCN, normalized" search option searches by "$a" subfield of "010" field only (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C442835'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.selectSearchOptions(testData.lccnOption, '');
        InventorySearchAndFilter.executeSearch(testData.lccnSearchQuery);
        InventorySearchAndFilter.verifySearchResult(testData.searchResult);
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventoryInstances.verifySelectedSearchOption(testData.defaultSearchOption);
        InventorySearchAndFilter.verifyResultPaneEmpty();

        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          testData.lccnSearchQuery,
          testData.containsAll,
          testData.lccnOption,
        );
        InventoryInstances.checkAdvSearchModalValues(
          0,
          testData.lccnSearchQuery,
          testData.containsAll,
          testData.lccnOption,
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventorySearchAndFilter.verifySearchResult(testData.searchResult);
      },
    );
  });
});
