import permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

let userId;
const item = {
  instanceName: `testQuerySearch_${getRandomPostfix()}`,
  itemBarcode: `987${getRandomPostfix()}`,
  publisher: `publisherName${getRandomPostfix()}`,
  holdingCallNumber: getRandomPostfix(),
  itemCallNumber: getRandomPostfix(),
};

describe('ui-inventory: query search', () => {
  before('create inventory instance', () => {
    cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      InventoryInstances.createInstanceViaApi(
        item.instanceName,
        item.itemBarcode,
        item.publisher,
        item.holdingCallNumber,
        item.itemCallNumber,
      );
      cy.visit(TopMenu.inventoryPath);
    });
  });

  after('Delete all data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    Users.deleteViaApi(userId);
  });

  afterEach(() => {
    cy.getAdminToken();
    InventoryInstances.resetAllFilters();
  });

  [
    {
      searchTab: InventorySearchAndFilter.switchToInstance,
      value: `uniformTitle all ${item.instanceName}`,
    },
    {
      searchTab: InventorySearchAndFilter.switchToInstance,
      value: `publisher all ${item.publisher}`,
    },
    {
      searchTab: InventorySearchAndFilter.switchToHoldings,
      value: `holdingsNormalizedCallNumbers="${item.holdingCallNumber}"`,
    },
    {
      searchTab: InventorySearchAndFilter.switchToItem,
      value: `itemNormalizedCallNumbers="${item.itemCallNumber}"`,
    },
  ].forEach((searcher) => {
    it(
      'C9202 Test search field working for Query Search in Instance, Holdings and Item segment (spitfire)',
      { tags: ['smoke', 'spitfire'] },
      () => {
        searcher.searchTab();
        InventorySearchAndFilter.searchByParameter('Query search', searcher.value);
        InventorySearchAndFilter.verifySearchResult(item.instanceName);
      },
    );
  });
});
