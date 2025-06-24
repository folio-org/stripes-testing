import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  user: {},
  instanceIDs: [],
  contributorSearchOption: 'Contributor',
  allSearchOption: 'All',
  searchQueriesKeyword: ['MALOTT, DEANES', 'malott, deanes', 'Malott, Deanes', 'Malott, McDeanes'],
  searchQueriesContributor: [
    'MALOTT, DEANES',
    'malott, deanes',
    'Malott, Deanes',
    'Malott, McDeanes',
  ],
  searchQueriesAll: [
    'MALOTT, DEANES 1898-1997',
    'malott, deanes 1898-1997',
    'Malott, Deanes 1898-1997',
    'Malott, McDeanes 1898-1997',
  ],
  searchResultsThreeContributors: [
    'Malott, Deanes 1898-1997',
    'MALOTT, DEANES 1898-1997',
    'malott, deanes 1898-1997',
  ],
  searchResultsOneContributor: 'Malott, McDeanes 1898-1997',
  searchResulsAllInstances: [
    'C464068 MSEARCH-696 Instance 1 regular case',
    'C464068 MSEARCH-696 Instance 2 UPPER case',
    'C464068 MSEARCH-696 Instance 3 lower case',
  ],
  searchResultMixedCase: 'C464068 MSEARCH-696 Instance 4 Mc Case',

  marcFile: {
    marc: 'marcBibFileC464068.mrc',
    fileName: `testMarcFileC464068.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numberOfRecords: 4,
    propertyName: 'instance',
  },
};

const resultsInstancesTable = [
  testData.searchResulsAllInstances,
  testData.searchResulsAllInstances,
  testData.searchResulsAllInstances,
  [testData.searchResultMixedCase],
];

const resultsContributorsTable = [
  testData.searchResultsThreeContributors,
  testData.searchResultsThreeContributors,
  testData.searchResultsThreeContributors,
  [testData.searchResultsOneContributor],
];

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
      before('Create test data, login', () => {
        cy.getAdminToken();
        InventoryInstances.getInstancesViaApi({
          limit: 100,
          query: 'title="C464068 MSEARCH-696 Instance"',
        }).then((instances) => {
          if (instances) {
            instances.forEach(({ id }) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }
        });

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
          testData.user = userProperties;

          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            testData.marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.instanceIDs.push(record[testData.marcFile.propertyName].id);
            });
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        testData.instanceIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C464068 Search by "Contributor" field is case-insensitive (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C464068'] },
        () => {
          testData.searchQueriesKeyword.forEach((query, index) => {
            InventoryInstances.searchByTitle(query);
            for (let rowIndex = 0; rowIndex < resultsInstancesTable[index].length; rowIndex++) {
              InventoryInstances.checkResultsCellContainsAnyOfValues(
                resultsContributorsTable[index],
                2,
                rowIndex,
              );
            }
            resultsInstancesTable[index].forEach((result) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
            });
            InventoryInstances.resetAllFilters();
          });

          testData.searchQueriesContributor.forEach((query, index) => {
            InventoryInstances.searchInstancesWithOption(testData.contributorSearchOption, query);
            for (let rowIndex = 0; rowIndex < resultsInstancesTable[index].length; rowIndex++) {
              InventoryInstances.checkResultsCellContainsAnyOfValues(
                resultsContributorsTable[index],
                2,
                rowIndex,
              );
            }
            resultsInstancesTable[index].forEach((result) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
            });
            InventoryInstances.resetAllFilters();
          });

          testData.searchQueriesAll.forEach((query, index) => {
            InventoryInstances.searchInstancesWithOption(testData.allSearchOption, query);
            for (let rowIndex = 0; rowIndex < resultsInstancesTable[index].length; rowIndex++) {
              InventoryInstances.checkResultsCellContainsAnyOfValues(
                resultsContributorsTable[index],
                2,
                rowIndex,
              );
            }
            resultsInstancesTable[index].forEach((result) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
            });
            InventoryInstances.resetAllFilters();
          });
        },
      );
    });
  });
});
