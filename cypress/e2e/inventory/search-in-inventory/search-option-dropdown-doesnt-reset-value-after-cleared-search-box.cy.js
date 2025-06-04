import { Permissions } from '../../../support/dictionary';
import InventoryInstances, {
  searchHoldingsOptions,
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  instance: {
    name: `instance_${randomFourDigitNumber()}`,
    barcode: randomFourDigitNumber(),
  },
  user: {},
  searchOptions: {
    titleAllSearchOption: 'Title (all)',
    all: 'All',
    holdingUUID: {
      title: 'Holdings UUID',
      value: 'holdingsId',
    },
    barcode: {
      title: 'Barcode',
      value: 'items.barcode',
    },
  },
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;
        testData.instance.instanceId = InventoryInstances.createInstanceViaApi(
          testData.instance.name,
          testData.instance.barcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${testData.instance.instanceId}"`,
        }).then((holdings) => {
          testData.instance.hrid = holdings[0].hrid;
          testData.instance.holdingId = holdings[0].id;
        });
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.instance.barcode);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C353938 Verify that the search option dropdown doesnt reset selected value after user cleared search box (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C353938', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.selectSearchOptions(
          testData.searchOptions.titleAllSearchOption,
          testData.instance.name,
        );
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instance.name, true);
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.selectSearchOptions(
          testData.searchOptions.titleAllSearchOption,
          '',
        );

        InventorySearchAndFilter.verifySearchButtonDisabled();
        InventoryInstances.verifyInstanceResultListIsAbsent();
        InventoryInstances.verifySelectedSearchOption(testData.searchOptions.titleAllSearchOption);

        InventorySearchAndFilter.switchToHoldings();
        InventoryInstances.verifyInstanceResultListIsAbsent();
        InventoryInstances.verifySelectedSearchOption(searchHoldingsOptions[0]);

        InventorySearchAndFilter.selectSearchOptions(
          testData.searchOptions.holdingUUID.title,
          testData.instance.holdingId,
        );
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instance.name, true);
        InventorySearchAndFilter.checkRowsCount(1);

        InventorySearchAndFilter.selectSearchOptions(testData.searchOptions.holdingUUID.title, '');
        InventorySearchAndFilter.verifySearchButtonDisabled();
        InventoryInstances.verifyInstanceResultListIsAbsent();
        InventorySearchAndFilter.verifySelectedSearchOption(
          testData.searchOptions.holdingUUID.value,
        );

        InventorySearchAndFilter.switchToItem();
        InventoryInstances.verifyInstanceResultListIsAbsent();
        InventoryInstances.verifySelectedSearchOption(searchItemsOptions[0]);
        InventorySearchAndFilter.selectSearchOptions(
          testData.searchOptions.barcode.title,
          `${testData.instance.barcode}`,
        );
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instance.name, true);
        InventorySearchAndFilter.checkRowsCount(1);

        InventorySearchAndFilter.selectSearchOptions(testData.searchOptions.barcode.title, '');
        InventorySearchAndFilter.verifySearchButtonDisabled();
        InventoryInstances.verifyInstanceResultListIsAbsent();
        InventorySearchAndFilter.verifySelectedSearchOption(testData.searchOptions.barcode.value);
      },
    );
  });
});
