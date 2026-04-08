import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C380403_FolioInstance_${randomPostfix}`;
    const callNumber = `AT_C380403_CN_${randomPostfix}`;
    const firstInstanceTitle = `${instanceTitlePrefix}_1`;
    const newInstanceTitle = `${instanceTitlePrefix}_2`;
    const folioInstances = [];

    let location;
    let user;

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C380403');

          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
            location = res;
          });

          folioInstances.push(
            InventoryInstances.generateFolioInstances({
              instanceTitlePrefix: firstInstanceTitle,
              holdings: [{ id: uuid(), callNumber }],
            })[0],
          );
        })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances,
            location,
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            user = userProperties;

            CallNumberBrowseSettings.assignCallNumberTypesViaApi({
              name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
              callNumberTypes: [],
            });

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C380403 Browse call number pane remains same results when user switches to search pane and back (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C380403'] },
      () => {
        // Step 1-2: Switch to browse, select "Call numbers (all)", browse for call number
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );
        BrowseCallNumber.waitForCallNumberToAppear(callNumber);
        InventorySearchAndFilter.browseSearch(callNumber);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);

        // Step 3: Click on the call number value from the result list
        BrowseCallNumber.clickOnResult(callNumber);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.verifySearchResult(firstInstanceTitle);

        // Step 4: Click on Search tab - nothing happens (already on search)
        InventorySearchAndFilter.switchToSearchTab();
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.verifySearchResult(firstInstanceTitle);

        // Step 5: Click "Reset all" button
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.checkSearchQueryText('');

        // Step 6-7: Actions > New, fill required fields, save
        InventoryInstances.addNewInventory();
        InventoryNewInstance.fillRequiredValues(newInstanceTitle);
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.verifyInstanceTitle(newInstanceTitle);

        // Step 8-9: Add holdings, fill required fields, save
        InventoryInstance.pressAddHoldingsButton();
        HoldingsRecordEdit.fillHoldingFields({
          permanentLocation: `${location.name} (${location.code})`,
        });
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });

        // Step 10: Switch to Holdings tab
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        InventorySearchAndFilter.checkSearchQueryText('');
        InventorySearchAndFilter.verifyResultListExists(false);

        // Step 11: Search for the created instance
        InventoryInstances.searchByTitle(newInstanceTitle);
        InventoryInstances.selectInstanceByTitle(newInstanceTitle);
        InventoryInstance.verifyInstanceTitle(newInstanceTitle);

        // Step 12: Click "View holdings" button
        InventoryInstance.openHoldingView();

        // Step 13: Actions > Delete holdings > confirm
        HoldingsRecordView.delete();
        InventoryInstance.verifyInstanceTitle(newInstanceTitle);
        InventoryInstance.verifyHoldingsAbsent('');

        // Step 14: Click Browse tab - browse pane should show same results as step 2
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(callNumber);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
      },
    );
  });
});
