import getRandomPostfix from '../../../support/utils/stringTools';
import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';

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
    itemWithoutSpace: 'RR718',
    itemWithLowerCaseR: 'Rr 718'
  };

  const search = (query) => {
    BrowseCallNumber.clickBrowseBtn();
    InventorySearchAndFilter.verifyKeywordsAsDefault();
    InventorySearchAndFilter.selectBrowseCallNumbers();
    InventorySearchAndFilter.verifyCallNumberBrowseEmptyPane();
    InventoryActions.actionsIsAbsent();
    InventorySearchAndFilter.showsOnlyEffectiveLocation();
    InventorySearchAndFilter.browseSubjectsSearch(query);
    BrowseCallNumber.checkExactSearchResult(testData.exactSearch, item.instanceName);
  };

  beforeEach('Creating user and instance with item with call number', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.uiCallNumberBrowse.gui
      ]).then(userProperties => {
        testData.user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path: TopMenu.inventoryPath, waiter: InventorySearchAndFilter.waitLoading });
        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode, item.publisher, item.holdingCallNumber, item.itemCallNumber);
      });
    });
  });

  afterEach('Deleting user and instance', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    Users.deleteViaApi(testData.user.userId);
  });

  it('C358140 Verify that browsing for "call number" with "space" value will get the correct result (spitfire)', { tags: [DevTeams.spitfire, TestTypes.smoke] }, () => {
    search(testData.exactSearch);
    BrowseCallNumber.checkExactSearchResult(testData.exactSearch);
    BrowseContributors.resetAllInSearchPane();
    search(testData.itemWithoutSpace);
    BrowseCallNumber.checkExactSearchResult(testData.exactSearch);
    BrowseContributors.resetAllInSearchPane();
    search(testData.itemWithLowerCaseR);
    BrowseCallNumber.checkExactSearchResult(testData.exactSearch);
  });
});
