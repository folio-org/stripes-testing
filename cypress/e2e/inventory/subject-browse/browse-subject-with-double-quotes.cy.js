import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomLetters = getRandomLetters(7);
    const testData = {
      instanceTitle: `AT_C397322_FolioInstance_${getRandomPostfix()}`,
      subjectWithDoubleQuotes: `AT_C397322 "Vaticana". ${randomLetters} Smth`,
      searchQueryNoMatch: `AT_C397322 "Vaticana". ${randomLetters}`,
    };
    const subjectOption = 'Subject';
    let createdInstanceId;
    let testUser;

    before('Create test data', () => {
      cy.getAdminToken();

      cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: testData.instanceTitle,
            subjects: [
              {
                value: testData.subjectWithDoubleQuotes,
              },
            ],
          },
        }).then((instanceData) => {
          createdInstanceId = instanceData.instanceId;

          cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
            testUser = userProperties;
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.waitContentLoading();
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      Users.deleteViaApi(testUser.userId);
    });

    it(
      'C397322 Browse subject which has double quotes (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C397322'] },
      () => {
        // Step 1: Select "Browse" toggle
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();

        // Step 2: Select "Subjects" browse option
        BrowseSubjects.select();
        BrowseSubjects.waitForSubjectToAppear(testData.subjectWithDoubleQuotes);

        // Step 3: Input query that will NOT return exact match result with double quotes
        BrowseSubjects.browse(testData.searchQueryNoMatch);

        // Step 4: Click "Search" button and verify placeholder
        BrowseSubjects.verifyNonExistentSearchResult(testData.searchQueryNoMatch);

        // Step 5: Update query to return exact match result with double quotes
        BrowseSubjects.clearSearchTextfield();
        BrowseSubjects.browse(testData.subjectWithDoubleQuotes);

        // Step 6: Press "Enter" key (handled by browse method) and verify bold text
        BrowseSubjects.checkValueIsBold(testData.subjectWithDoubleQuotes);

        // Step 7: Click on highlighted subject name
        BrowseSubjects.verifyClickTakesToInventory(testData.subjectWithDoubleQuotes);

        // Step 8: Click on "Search" tab
        InventorySearchAndFilter.switchToSearchTab();

        // Step 9: Click "Reset all" button
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();

        // Steps 10-11: Select "Subject" search option and fill query
        InventorySearchAndFilter.selectSearchOptions(
          subjectOption,
          testData.subjectWithDoubleQuotes,
        );

        // Step 12: Click "Search" button and verify record is displayed
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
      },
    );
  });
});
