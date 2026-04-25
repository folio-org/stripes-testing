import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const rnd = getRandomPostfix();
    const instancePrefix = `AT_C350598_FolioInstance_${rnd}`;
    const testData = {
      callNumber: `CN_C350598_${rnd}`,
      defaultSearchOption: searchInstancesOptions[0],
    };

    const folioInstance = InventoryInstances.generateFolioInstances({
      instanceTitlePrefix: instancePrefix,
      itemsProperties: {
        itemLevelCallNumber: testData.callNumber,
      },
    });

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C350598');

      cy.then(() => {
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((res) => {
          testData.location = res;
        });
      })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: folioInstance,
            location: testData.location,
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.uiCallNumberBrowse.gui]).then((userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
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
      'C350598 Verify navigation to "Search" toggle (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C350598'] },
      () => {
        // Step 1: Select "Call numbers (all)" option
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );

        // Step 2: Browse by call number — verify found and highlighted in bold
        BrowseCallNumber.waitForCallNumberToAppear(testData.callNumber);
        InventorySearchAndFilter.browseSearch(testData.callNumber);
        BrowseCallNumber.valueInResultTableIsHighlighted(testData.callNumber);

        // Step 3: Switch to "Search" toggle — verify default Inventory page
        InventorySearchAndFilter.switchToSearchTab();
        InventorySearchAndFilter.verifySearchToggleButtonSelected();
        InventorySearchAndFilter.verifySearchFieldIsEmpty();
        InventorySearchAndFilter.verifySearchButtonDisabled();
        InventorySearchAndFilter.searchTypeDropdownDefaultValue(testData.defaultSearchOption);
        InventoryInstances.checkActionsButtonInSecondPane();
        InventoryInstances.verifyInventorySearchPaneheader(false);
      },
    );
  });
});
