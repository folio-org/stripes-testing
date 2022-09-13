import getRandomPostfix from '../../../support/utils/stringTools';
import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearch from '../../../support/fragments/inventory/inventorySearch';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';

describe('ui-inventory: search', () => {
  const item = {
    instanceName: `instanceForRecord_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
    publisher: null,
    holdingCallNumber: '1',
    itemCallNumber: 'RR 718',
  };
  const testData = {
    exactSearch: item.itemCallNumber,
    nonExactSearch: item.itemCallNumber.replace(/ /g, '')
  };

  const search = (query) => {
    InventorySearch.verifyKeywordsAsDefault();
    InventorySearch.selectBrowseCallNumbers();
    InventorySearch.verifyCallNumberBrowseEmptyPane();
    InventoryActions.actionsIsAbsent();
    InventorySearch.showsOnlyEffectiveLocation();
    InventorySearch.browseSubjectsSearch(query);
    BrowseCallNumber.checkExactSearchResult(testData.exactSearch, item.instanceName);
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

  it('C358140 Verify that browsing for "call number" with "space" value will get the correct result (spitfire)', { tags: [DevTeams.spitfire, TestTypes.smoke] }, () => {
    search(testData.exactSearch);
    BrowseCallNumber.checkExactSearchResult(testData.exactSearch);
    BrowseContributors.resetAllInSearchPane();
    search(testData.nonExactSearch);
    BrowseCallNumber.checkExactSearchResult(testData.exactSearch);
    // Add the test. There are no several additional checks that are present in steps.
  });
});
