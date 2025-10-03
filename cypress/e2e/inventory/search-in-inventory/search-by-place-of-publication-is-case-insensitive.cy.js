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
      searchOption: ['Place of publication', 'All', 'Query search'],
      searchValue: ['Milwaukeeauto', 'milwaukeeauto', 'MILWAUKEEAUTO'],
      searchResults: [
        'C496182 (lower case)Whales / Diane Swanson.',
        'C496182 (Regular case)Whales / Diane Swanson.',
        'C496182 (UPPER case)Whales / Diane Swanson.',
      ],
    };

    const marcFile = {
      marc: 'marcBibFileForC496182.mrc',
      fileName: `testMarcFileC496182.${getRandomPostfix()}.mrc`,
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
      'C496182 Search for Instance by "Place of publication" field is case insensitive (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C496182'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();

        testData.searchOption.forEach((option) => {
          testData.searchValue.forEach((value) => {
            InventorySearchAndFilter.selectSearchOption(option);
            if (option === 'Query search') {
              InventorySearchAndFilter.executeSearch(`publication.place=${value}`);
            } else {
              InventorySearchAndFilter.executeSearch(value);
            }
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          });
        });
      },
    );
  });
});
