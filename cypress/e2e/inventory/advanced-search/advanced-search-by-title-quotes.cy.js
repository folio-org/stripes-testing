import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { ADVANCED_SEARCH_MODIFIERS } from '../../../support/constants';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = `auto${getRandomLetters(10)}`;
    const testData = {
      instanceTitles: [
        `"Seeing${randomLetters}-Eye${randomLetters}" Dogs${randomLetters} : hearings about smth C605895 ${randomPostfix}`,
        `C605895 ${randomPostfix} The critical reception of someone : "tests and validations" / by Author`,
      ],
      searchOption: searchInstancesOptions[2],
    };
    const searches = [
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
        query: `"Seeing${randomLetters}`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
        query: `"Seeing${randomLetters}"`,
        result: null,
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
        query: `Seeing${randomLetters}`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
        query: `"Seeing${randomLetters}-Eye${randomLetters}"`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
        query: `Seeing${randomLetters}-Eye${randomLetters}`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
        query: `"Seeing${randomLetters}-Eye${randomLetters}`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
        query: `"Seeing${randomLetters}-Eye${randomLetters}"`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
        query: `"Seeing${randomLetters}-Eye${randomLetters}`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
        query: `Seeing${randomLetters}-Eye${randomLetters}`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ANY,
        query: `"Seeing${randomLetters}-Eye${randomLetters}"`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ANY,
        query: `"Seeing${randomLetters}-Eye${randomLetters}`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ANY,
        query: `Seeing${randomLetters}-Eye${randomLetters}`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
        query: `"Seeing${randomLetters}-Eye${randomLetters}"`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
        query: `"Seeing${randomLetters}-Eye${randomLetters}`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
        query: `Seeing${randomLetters}-Eye${randomLetters}`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
        query: `"Seeing${randomLetters}-Eye${randomLetters}" Dogs${randomLetters}`,
        result: testData.instanceTitles[0],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
        query: `C605895 ${randomPostfix} The critical reception of someone : "tests and validations"`,
        result: testData.instanceTitles[1],
      },
      {
        modifier: ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
        query: `C605895 ${randomPostfix} The critical reception of someone : tests and validations`,
        result: null,
      },
    ];
    const createdRecordIds = [];

    before('Creating data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('C605895');

      testData.instanceTitles.forEach((instanceTitle) => {
        InventoryInstance.createInstanceViaApi({ instanceTitle }).then(({ instanceData }) => {
          createdRecordIds.push(instanceData.instanceId);
        });
      });

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Deleting data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordIds.forEach((createdRecordId) => {
        InventoryInstance.deleteInstanceViaApi(createdRecordId);
      });
    });

    it(
      'C605895 Search for Instance record which has quotes in title using "Advanced search" modal (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C605895'] },
      () => {
        searches.forEach((search) => {
          InventoryInstances.clickAdvSearchButton();
          InventoryInstances.fillAdvSearchRow(
            0,
            search.query,
            search.modifier,
            testData.searchOption,
          );
          InventoryInstances.checkAdvSearchModalValues(
            0,
            search.query,
            search.modifier,
            testData.searchOption,
          );
          InventoryInstances.clickSearchBtnInAdvSearchModal();
          InventoryInstances.checkAdvSearchModalAbsence();

          if (search.result) InventorySearchAndFilter.verifySearchResult(search.result);
          else InventorySearchAndFilter.verifyNoRecordsFound();

          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        });
      },
    );
  });
});
