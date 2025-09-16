import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const testData = {
      searchResultsPrefix: 'C407727auto Search by Contributor (advanced search) - Instance',
      searchQueryComponents: {
        lastName: 'Leeadvauto',
        firstName: 'Stanadvauto',
        firstDate: '407727',
        secondDate: '4077271',
      },
      importPropertyName: 'instance',
      searchOperators: {
        exact: 'Exact phrase',
        containsAny: 'Contains any',
        containsAll: 'Contains all',
        startsWith: 'Starts with',
      },
      searchOption: 'Contributor',
      searchResultNumbers: [
        [1, 2, 3],
        [1, 2, 3, 5],
        [1, 2, 3, 5],
        [1, 2],
        [1, 2, 3, 4, 5, 6],
        [1, 2, 3, 4, 5, 6],
        [1, 4],
      ],
    };
    const createdRecordIDs = [];

    const marcFile = {
      marc: 'marcBibFileC407727.mrc',
      fileName: `C407727 testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      numberOfRecords: 2,
      propertyName: 'instance',
    };

    before('Creating data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi(testData.searchResultsPrefix);
      // wait for all records to be deleted
      cy.wait(3000);

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[testData.importPropertyName].id);
          });
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    after('Deleting data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstances.deleteInstanceByTitleViaApi(testData.searchResultsPrefix);
    });

    it(
      'C407727 Search for Instance by "Contributor" search option using "Advanced search" modal (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C407727'] },
      () => {
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          `${testData.searchQueryComponents.lastName}, ${testData.searchQueryComponents.firstName}, ${testData.searchQueryComponents.firstDate}`,
          testData.searchOperators.exact,
          testData.searchOption,
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        testData.searchResultNumbers[0].forEach((number) => {
          InventorySearchAndFilter.verifySearchResult(`${testData.searchResultsPrefix} ${number}`);
        });
        InventorySearchAndFilter.checkRowsCount(testData.searchResultNumbers[0].length);

        InventorySearchAndFilter.resetAll();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          `${testData.searchQueryComponents.lastName}, ${testData.searchQueryComponents.firstName}`,
          testData.searchOperators.containsAll,
          testData.searchOption,
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        testData.searchResultNumbers[1].forEach((number) => {
          InventorySearchAndFilter.verifySearchResult(`${testData.searchResultsPrefix} ${number}`);
        });
        InventorySearchAndFilter.checkRowsCount(testData.searchResultNumbers[1].length);

        InventorySearchAndFilter.resetAll();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          `${testData.searchQueryComponents.firstName} ${testData.searchQueryComponents.lastName}`,
          testData.searchOperators.containsAll,
          testData.searchOption,
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        testData.searchResultNumbers[2].forEach((number) => {
          InventorySearchAndFilter.verifySearchResult(`${testData.searchResultsPrefix} ${number}`);
        });
        InventorySearchAndFilter.checkRowsCount(testData.searchResultNumbers[2].length);

        InventorySearchAndFilter.resetAll();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          `${testData.searchQueryComponents.lastName}, ${testData.searchQueryComponents.firstName}`,
          testData.searchOperators.startsWith,
          testData.searchOption,
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        testData.searchResultNumbers[3].forEach((number) => {
          InventorySearchAndFilter.verifySearchResult(`${testData.searchResultsPrefix} ${number}`);
        });
        InventorySearchAndFilter.checkRowsCount(testData.searchResultNumbers[3].length);

        InventorySearchAndFilter.resetAll();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          `${testData.searchQueryComponents.lastName}, ${testData.searchQueryComponents.firstName}`,
          testData.searchOperators.containsAny,
          testData.searchOption,
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        testData.searchResultNumbers[4].forEach((number) => {
          InventorySearchAndFilter.verifySearchResult(`${testData.searchResultsPrefix} ${number}`);
        });
        InventorySearchAndFilter.checkRowsCount(testData.searchResultNumbers[4].length);

        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          `${testData.searchQueryComponents.firstName} ${testData.searchQueryComponents.lastName}`,
          testData.searchOperators.containsAny,
          testData.searchOption,
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        testData.searchResultNumbers[5].forEach((number) => {
          InventorySearchAndFilter.verifySearchResult(`${testData.searchResultsPrefix} ${number}`);
        });
        InventorySearchAndFilter.checkRowsCount(testData.searchResultNumbers[5].length);

        InventorySearchAndFilter.resetAll();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          `${testData.searchQueryComponents.firstName}, ${testData.searchQueryComponents.lastName}`,
          testData.searchOperators.containsAny,
          testData.searchOption,
        );
        InventoryInstances.fillAdvSearchRow(
          1,
          `${testData.searchQueryComponents.firstDate}, ${testData.searchQueryComponents.lastName}, ${testData.searchQueryComponents.firstName}`,
          testData.searchOperators.containsAny,
          testData.searchOption,
          'OR',
        );
        InventoryInstances.fillAdvSearchRow(
          2,
          testData.searchQueryComponents.lastName,
          testData.searchOperators.startsWith,
          testData.searchOption,
          'AND',
        );
        InventoryInstances.fillAdvSearchRow(
          3,
          `${testData.searchQueryComponents.lastName}, ${testData.searchQueryComponents.firstName}, ${testData.searchQueryComponents.firstDate}-${testData.searchQueryComponents.secondDate}`,
          testData.searchOperators.containsAll,
          testData.searchOption,
          'NOT',
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        testData.searchResultNumbers[6].forEach((number) => {
          InventorySearchAndFilter.verifySearchResult(`${testData.searchResultsPrefix} ${number}`);
        });
        InventorySearchAndFilter.checkRowsCount(testData.searchResultNumbers[6].length);
      },
    );
  });
});
