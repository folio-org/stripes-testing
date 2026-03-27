import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomLetters = getRandomLetters(5);
    const rnd = getRandomPostfix();
    const locationAccordionName = 'Effective location (item)';
    const instancePrefix = `AT_C350592_FolioInstance_${rnd}`;
    const testData = {
      callNumber1: `QA35.59.J20 ${randomLetters} C350592A`,
      callNumber2: `QA35.59.J20 ${randomLetters} C350592B`,
    };

    const folioInstance1 = InventoryInstances.generateFolioInstances({
      instanceTitlePrefix: `${instancePrefix}_1`,
      itemsProperties: {
        itemLevelCallNumber: testData.callNumber1,
      },
    });

    const folioInstance2 = InventoryInstances.generateFolioInstances({
      instanceTitlePrefix: `${instancePrefix}_2`,
      itemsProperties: {
        itemLevelCallNumber: testData.callNumber2,
      },
    });

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C350592');

      cy.then(() => {
        cy.getLocations({
          limit: 2,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then(() => {
          testData.location1 = Cypress.env('locations')[0];
          testData.location2 = Cypress.env('locations')[1];
        });
      })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: folioInstance1,
            location: testData.location1,
          });
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: folioInstance2,
            location: testData.location2,
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.uiCallNumberBrowse.gui]).then((userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
    });

    it(
      'C350592 Verify filter by location (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C350592'] },
      () => {
        // Step 1: Select "Call numbers (all)" option
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );

        // Step 2: Browse by call number
        [testData.callNumber1, testData.callNumber2].forEach((callNumber) => {
          BrowseCallNumber.waitForCallNumberToAppear(callNumber);
        });
        InventorySearchAndFilter.browseSearch(testData.callNumber1);
        BrowseCallNumber.checkValuePresentInResults(testData.callNumber1);
        BrowseCallNumber.checkValuePresentInResults(testData.callNumber2);

        // Step 3: Open "Effective location (item)" accordion
        InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
        InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(locationAccordionName);
        InventorySearchAndFilter.verifyOptionAvailableMultiselect(
          locationAccordionName,
          testData.location1.name,
        );
        InventorySearchAndFilter.verifyOptionAvailableMultiselect(
          locationAccordionName,
          testData.location2.name,
        );

        // Step 4: Select location1 filter — only callNumber1 should remain
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          locationAccordionName,
          testData.location1.name,
        );
        BrowseCallNumber.checkValuePresentInResults(testData.callNumber1);
        BrowseCallNumber.checkValuePresentInResults(testData.callNumber2, false);

        // Step 5: Reset All — verify browse landing page
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.verifySearchAndFilterPaneBrowseToggle();
        BrowseContributors.checkBrowseQueryText('');
      },
    );
  });
});
