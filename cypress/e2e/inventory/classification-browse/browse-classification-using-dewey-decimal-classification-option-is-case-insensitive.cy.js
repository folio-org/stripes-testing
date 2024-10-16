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
  describe('Instance classification browse', () => {
    const testData = {
      classificationOption: 'Library of Congress classification',
      searchQueries: ['M1 33A', 'm1 33a'],
      searchResults: ['m1 33a', 'M1 33A'],
      instanceTitles: [
        'C468258 Search by Classification (case insensitive check) Instance 1 - Dewey UPPER case',
        'C468258 Search by Classification (case insensitive check) Instance 2 - Dewey lower case',
      ],
    };

    const marcFile = {
      marc: 'marcBibFileForC468258.mrc',
      fileName: `testMarcFileC468258.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    before(() => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468258*');

      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        testData.preconditionUserId = userProperties.userId;

        cy.getUserToken(userProperties.username, userProperties.password);
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
      });
    });

    after(() => {
      cy.getAdminToken();
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.preconditionUserId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C468258 Browse for classification using "Dewey Decimal classification" option is case-insensitive (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        testData.searchQueries.forEach((query) => {
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            testData.classificationOption,
          );
          InventorySearchAndFilter.browseSearch(query);
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResultIncludingValue(expectedResult);
          });
        });
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.searchResults[0]);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          'Query search',
          'classifications.classificationNumber=="m1 33a"',
        );
        testData.instanceTitles.forEach((title) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(title);
        });
      },
    );
  });
});
