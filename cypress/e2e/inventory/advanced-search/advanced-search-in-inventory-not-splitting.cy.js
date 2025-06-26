import {
  ADVANCED_SEARCH_MODIFIERS,
  LDE_ADVANCED_SEARCH_CONDITIONS,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getRandomLetters } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const randomLetters = getRandomLetters(10);
    const testData = {
      advSearchOption: 'Advanced search',
      keywordSearchOption: 'Keyword (title, contributor, identifier)',
      instanceTitles: [
        `Chile and Peru : two paths to social${randomLetters} justice / edited by Leila A. Bradfield. C466212`,
        `Consiliō et animīs : tracing a path to not social${randomLetters} justice through the classics / by Antoinette M. Ryan. C466212`,
        `The paths to social${randomLetters} deviance or conformity : a model of the process / Alvin Rudoff. C466212`,
        `Political philosophy : the narrow path to social${randomLetters} progress / Anthony C. Patton. C466212`,
        `Queer stepfamilies : the path to social${randomLetters} and legal recognition / Katie L. Acosta. C466212`,
        `On the Not Middle${randomLetters} Path : the social basis for sustainable development in Bhutan / Chhewang Rinzin. C466212`,
      ],
    };
    const searchParameters = [
      {
        query: `path to social${randomLetters} and legal recognition`,
        modifier: ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
        result: testData.instanceTitles[4],
      },
      {
        query: `The paths to social${randomLetters} deviance OR conformity`,
        modifier: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
        result: testData.instanceTitles[2],
      },
      {
        query: `a path to not social${randomLetters} justice through the classics`,
        modifier: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
        result: testData.instanceTitles[1],
      },
    ];
    const searchParametersMultiline = [
      {
        operator: undefined,
        query: `social${randomLetters} and legal recognition`,
        modifier: ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
      },
      {
        operator: LDE_ADVANCED_SEARCH_CONDITIONS.OR,
        query: `a path to not social${randomLetters} justice through the classics`,
        modifier: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ANY,
      },
      {
        operator: LDE_ADVANCED_SEARCH_CONDITIONS.AND,
        query: `social${randomLetters}`,
        modifier: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
      },
      {
        operator: LDE_ADVANCED_SEARCH_CONDITIONS.NOT,
        query: `On the Not Middle${randomLetters} Path`,
        modifier: ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
      },
    ];
    const searchResultsMultiline = testData.instanceTitles.slice(0, -1);
    const createdInstanceIds = [];

    before('Creating data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
        })
        .then(() => {
          testData.instanceTitles.forEach((title) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title,
              },
            }).then((instance) => {
              createdInstanceIds.push(instance.instanceId);
            });
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Deleting data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        createdInstanceIds.forEach((instanceId) => {
          InventoryInstance.deleteInstanceViaApi(instanceId);
        });
      });
    });

    it(
      'C466212 Verify that search operators "OR" "AND" "NOT" are not splitting the search terms in "Advanced search" modal of "Inventory" app (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466212'] },
      () => {
        InventoryInstances.clickAdvSearchButton();
        searchParameters.forEach((search) => {
          InventoryInstances.fillAdvSearchRow(
            0,
            search.query,
            search.modifier,
            testData.keywordSearchOption,
          );
          InventoryInstances.clickSearchBtnInAdvSearchModal();
          InventoryInstances.checkAdvSearchModalAbsence();
          InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
          InventorySearchAndFilter.verifySearchResult(search.result);
          InventorySearchAndFilter.checkRowsCount(1);
          InventoryInstances.clickAdvSearchButton();
          InventoryInstances.checkAdvSearchModalValues(
            0,
            search.query,
            search.modifier,
            testData.keywordSearchOption,
          );
        });

        InventoryInstances.clickAdvSearchButton();
        searchParametersMultiline.forEach((row, rowIndex) => {
          InventoryInstances.fillAdvSearchRow(
            rowIndex,
            row.query,
            row.modifier,
            testData.keywordSearchOption,
            row.operator,
          );
        });
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        searchResultsMultiline.forEach((result) => {
          InventorySearchAndFilter.verifySearchResult(result);
        });
        InventorySearchAndFilter.checkRowsCount(searchResultsMultiline.length);
        InventoryInstances.clickAdvSearchButton();
        searchParametersMultiline.forEach((row, rowIndex) => {
          InventoryInstances.checkAdvSearchModalValues(
            rowIndex,
            row.query,
            row.modifier,
            testData.keywordSearchOption,
            row.operator,
          );
        });
      },
    );
  });
});
