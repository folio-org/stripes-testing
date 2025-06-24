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
      searchItem: [
        {
          searchOption: 'Place of publication',
          searchValue: 'Burlingtonauto, Massachusettsauto',
        },
        {
          searchOption: 'Place of publication',
          searchValue: 'Burlingtonauto',
        },
        {
          searchOption: 'Place of publication',
          searchValue: 'Massachusettsauto',
        },
        {
          searchOption: 'Place of publication',
          searchValue: 'Burlingtonauto Massachusettsauto',
        },
        {
          searchOption: 'Place of publication',
          searchValue: 'Massachusettsauto, Burlingtonauto',
        },
        {
          searchOption: 'All',
          searchValue: 'Burlingtonauto',
        },
        {
          searchOption: 'All',
          searchValue: 'Massachusettsauto',
        },
        {
          searchOption: 'All',
          searchValue: 'Burlingtonauto Massachusettsauto',
        },
        {
          searchOption: 'All',
          searchValue: 'Massachusettsauto, Burlingtonauto',
        },
        {
          searchOption: 'Query search',
          searchValue: 'publication.place=Massachusettsauto, Burlingtonauto',
        },
        {
          searchOption: 'Query search',
          searchValue: 'publication.place=Burlingtonauto',
        },
        {
          searchOption: 'Query search',
          searchValue: 'publication.place=Massachusettsauto',
        },
        {
          searchOption: 'Query search',
          searchValue: 'publication.place=Burlingtonauto Massachusettsauto',
        },
        {
          searchOption: 'Query search',
          searchValue: 'publication.place=Massachusettsauto, Burlingtonauto',
        },
      ],
      searchResult: 'C496179 Tabletop game design for video game designers / Ethan Ham.',
    };

    const marcFile = {
      marc: 'marcBibFileForC496179.mrc',
      fileName: `testMarcFileC496179.${getRandomPostfix()}.mrc`,
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
      'C496179 Search for Instance by "Place of publication" field using queries with different order of search terms (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C496179'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();

        testData.searchItem.forEach((item) => {
          InventorySearchAndFilter.selectSearchOption(item.searchOption);
          InventorySearchAndFilter.executeSearch(item.searchValue);
          InventorySearchAndFilter.verifySearchResult(testData.searchResult);
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        });
      },
    );
  });
});
