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
      searchValue: ['Hünfelden', 'Hunfelden'],
      searchResult:
        'C496181 Aller Wort verschwiegenes Rot : Albrecht Goes zu Ehren / mit Beiträgen von Wolfram Aichele ... [et al.] ; herausgegen von Oliver Kohler.',
    };

    const marcFile = {
      marc: 'marcBibFileForC496181.mrc',
      fileName: `testMarcFileC496181.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    before(() => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;

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
      'C496181 Search for Instance by "Place of publication" field which has value with diacritics (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
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
            InventorySearchAndFilter.verifySearchResult(testData.searchResult);
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          });
        });
      },
    );
  });
});
