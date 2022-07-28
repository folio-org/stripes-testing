import getRandomPostfix from '../../../support/utils/stringTools';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearch from '../../../support/fragments/inventory/inventorySearch';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('ui-inventory: search', () => {
  const item = {
    instanceName: `instanceForRecord_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
    publisher: null,
    holdingCallNumber: '1',
    itemCallNumber: '___RR 718',
  };
  const testData = {
    exactSearch : item.itemCallNumber,
    nonExactSearch: item.itemCallNumber.trim(),
  };

  beforeEach('Creating user and instance with item with call number', () => {
    cy.getAdminToken().then(() => {
      InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode, item.publisher, item.holdingCallNumber, item.itemCallNumber);
    });

    cy.loginAsAdmin({ path: TopMenu.inventoryPath, waiter: InventorySearch.waitLoading });
  });

  afterEach('Deleting user and instance', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
  });

  it('C358140 Verify that browsing for "call number" with "space" value will get the correct result (spitfire)', { tags : [DevTeams.spitfire, TestTypes.smoke] }, () => {
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.selectBrowseCallNumbers();
    InventorySearch.verifyCallNumberBrowseEmptyPane();
    InventoryActions.actionsIsAbsent();
    InventorySearch.showsOnlyEffectiveLocation();
    BrowseCallNumber.select();
    BrowseCallNumber.browse(testData.exactSearch);
    BrowseCallNumber.checkExactSearchResult(testData.exactSearch, item.instanceName);
    BrowseCallNumber.browse(testData.nonExactSearch);
    BrowseCallNumber.checkNonExactSearchResult(testData.nonExactSearch);
  });
});
