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
  users: [],
  instanceIDs: [],
  contributorSearchOption: 'Contributor',
  allSearchOption: 'All',
  advSearchOption: 'Advanced search',
  keywordSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
  keywordAdvancedSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
  contributorValue: 'Dobynsauto, Stephenauto, 1941-',
  searchQueries: [
    'Dobynsauto, Stephenauto, 1941-',
    'Dobynsauto, Stephenauto,',
    'Dobynsauto',
    'Stephenauto Dobynsauto',
  ],
  searchResulsAllInstances: [
    'C451637 A boat off the coast',
    'C451637 The Balthus poems',
    'C451637 After shocks, near escapes',
    'C451637 Black dog, red dog : poems',
    'C451637 Body traffic : poems / by Stephen Dobyns.',
  ],

  marcFile: {
    marc: 'marcBibFileC451637.mrc',
    fileName: `testMarcFileC451637.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numberOfRecords: 5,
    propertyName: 'instance',
  },
};

const advSearchParameters = [
  {
    modifier: 'Contains all',
    searchOption: testData.keywordAdvancedSearchOption,
  },
  {
    modifier: 'Exact phrase',
    searchOption: testData.allSearchOption,
  },
  {
    modifier: 'Contains all',
    searchOption: testData.allSearchOption,
  },
  {
    modifier: 'Starts with',
    searchOption: testData.allSearchOption,
  },
  {
    modifier: 'Contains any',
    searchOption: testData.allSearchOption,
  },
];

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.getInstancesViaApi({
        limit: 100,
        query: 'title="C451637*"',
      }).then((instances) => {
        if (instances) {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        }
      });

      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        testData.marcFile.jobProfileToRun,
      ).then((response) => {
        response.forEach((record) => {
          testData.instanceIDs.push(record[testData.marcFile.propertyName].id);
        });
      });
    });

    beforeEach('Create user, login', () => {
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.users.push(userProperties);
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.users.forEach((user) => {
        Users.deleteViaApi(user.userId);
      });
      testData.instanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C451637 Search by "Contributor" field using "All" search option. (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C451637'] },
      () => {
        testData.searchQueries.forEach((query) => {
          InventoryInstances.searchInstancesWithOption(testData.allSearchOption, query);
          for (let rowIndex = 0; rowIndex < testData.searchResulsAllInstances.length; rowIndex++) {
            InventoryInstances.checkResultsCellContainsAnyOfValues(
              [testData.contributorValue],
              2,
              rowIndex,
            );
          }
          testData.searchResulsAllInstances.forEach((result) => {
            InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
          });
          InventoryInstances.resetAllFilters();
        });

        InventoryInstances.searchInstancesWithOption(
          testData.contributorSearchOption,
          testData.contributorValue,
        );
        for (let rowIndex = 0; rowIndex < testData.searchResulsAllInstances.length; rowIndex++) {
          InventoryInstances.checkResultsCellContainsAnyOfValues(
            [testData.contributorValue],
            2,
            rowIndex,
          );
        }
        testData.searchResulsAllInstances.forEach((result) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
        });

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        InventorySearchAndFilter.verifySearchFieldIsEmpty();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.keywordSearchOption);
        InventoryInstances.searchInstancesWithOption(
          testData.allSearchOption,
          testData.contributorValue,
        );
        for (let rowIndex = 0; rowIndex < testData.searchResulsAllInstances.length; rowIndex++) {
          InventoryInstances.checkResultsCellContainsAnyOfValues(
            [testData.contributorValue],
            2,
            rowIndex,
          );
        }
        testData.searchResulsAllInstances.forEach((result) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
        });

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        InventorySearchAndFilter.verifySearchFieldIsEmpty();
        InventoryInstances.searchInstancesWithOption(
          testData.allSearchOption,
          testData.contributorValue,
        );
        for (let rowIndex = 0; rowIndex < testData.searchResulsAllInstances.length; rowIndex++) {
          InventoryInstances.checkResultsCellContainsAnyOfValues(
            [testData.contributorValue],
            2,
            rowIndex,
          );
        }
        testData.searchResulsAllInstances.forEach((result) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
        });
      },
    );

    it(
      'C451638 Search by "Contributor" field using "All" search option in "Advanced search" modal (spitfire)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C451638'] },
      () => {
        advSearchParameters.forEach((paramSet, index) => {
          InventoryInstances.clickAdvSearchButton();
          if (index) {
            InventoryInstances.checkAdvSearchModalValues(
              0,
              testData.contributorValue,
              advSearchParameters[index - 1].modifier,
              advSearchParameters[index - 1].searchOption,
            );
          }
          InventoryInstances.fillAdvSearchRow(
            0,
            testData.contributorValue,
            paramSet.modifier,
            paramSet.searchOption,
          );
          InventoryInstances.clickSearchBtnInAdvSearchModal();
          InventoryInstances.checkAdvSearchModalAbsence();
          testData.searchResulsAllInstances.forEach((result) => {
            InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
          });
        });
      },
    );
  });
});
