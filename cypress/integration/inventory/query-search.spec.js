import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import Users from '../../support/fragments/users/users';

let userId;
const item = {
  instanceName: `testQuerySearch_${getRandomPostfix()}`,
  itemBarcode: `987${getRandomPostfix()}`,
  publisher: `publisherName${getRandomPostfix()}`,
  holdingCallNumber: getRandomPostfix(),
  itemCallNumber: getRandomPostfix()
};

describe('ui-inventory: query search', () => {
  before('create inventory instance', () => {
    cy.createTempUser([permissions.inventoryAll.gui])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);
        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode, item.publisher, item.holdingCallNumber, item.itemCallNumber);
        cy.visit(TopMenu.inventoryPath);
      });
  });

  after('Delete all data', () => {
    InventoryInstances.deleteInstanceViaApi(item.itemBarcode);
    Users.deleteViaApi(userId);
  });

  afterEach(() => {
    InventoryInstances.resetAllFilters();
  });

  [
    { searchTab: InventorySearch.switchToInstance, value: `uniformTitle all ${item.instanceName}` },
    { searchTab: InventorySearch.switchToInstance, value: `publisher all ${item.publisher}` },
    { searchTab: InventorySearch.switchToHoldings, value: `holdingsNormalizedCallNumbers="${item.holdingCallNumber}"` },
    { searchTab: InventorySearch.switchToItem, value: `itemNormalizedCallNumbers="${item.itemCallNumber}"` },
  ].forEach(searcher => {
    it('C9202 Test search field working for Query Search in Instance, Holdings and Item segment', { tags: [testTypes.smoke] }, () => {
      searcher.searchTab();
      InventorySearch.searchByParameter('Query search', searcher.value);
      InventorySearch.verifySearchResult(item.instanceName);
    });
  });
});
