import getRandomPostfix from '../../../../support/utils/stringTools';
import DevTeams from '../../../../support/dictionary/devTeams';
import TestTypes from '../../../../support/dictionary/testTypes';
import InventoryActions from '../../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../../support/fragments/topMenu';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import Users from '../../../../support/fragments/users/users';
import permissions from '../../../../support/dictionary/permissions';

describe('Inventory -> Call Number Browse', () => {
  const item = {
    instanceName: `instanceForRecord_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
    publisher: null,
    holdingCallNumber: '1',
    itemCallNumber: 'RR 718',
    callNumber: 'PRT 718',
    copyNumber: 'c.4',
    callNumberSuffix: 'suf',
    volume: 'v.1',
    enumeration: 'e.2',
    chronology: 'ch.3',
  };

  const itemA1 = {
    instanceName: 'testA1',
    itemBarcode: getRandomPostfix(),
    publisher: null,
    holdingCallNumber: '1',
    itemCallNumber: '7777559A1',
  };

  const itemA2 = {
    instanceName: 'testA2',
    itemBarcode: getRandomPostfix(),
    publisher: null,
    holdingCallNumber: '1',
    itemCallNumber: '7777559A2',
  };

  const testData = {
    exactSearch: item.itemCallNumber,
    itemWithoutSpace: 'RR718',
    itemWithLowerCaseR: 'Rr 718',
    parameter: 'Keyword (title, contributor, identifier, HRID, UUID)',
  };

  const search = (query) => {
    BrowseCallNumber.clickBrowseBtn();
    InventorySearchAndFilter.verifyKeywordsAsDefault();
    InventorySearchAndFilter.selectBrowseCallNumbers();
    InventorySearchAndFilter.verifyCallNumberBrowseEmptyPane();
    InventoryActions.actionsIsAbsent();
    InventorySearchAndFilter.showsOnlyEffectiveLocation();
    InventorySearchAndFilter.browseSubjectsSearch(query);
  };

  const searchAndOpenInstance = (parametr, title) => {
    InventorySearchAndFilter.searchByParameter(parametr, title);
    InventoryInstances.selectInstance();
  };

  before('Creating user and instance with item with call number', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.uiCallNumberBrowse.gui
      ]).then(userProperties => {
        testData.user = userProperties;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode, item.publisher, item.holdingCallNumber, item.itemCallNumber);
        InventoryInstances.createInstanceViaApi(itemA1.instanceName, itemA1.itemBarcode, itemA1.publisher, itemA1.holdingCallNumber, itemA1.itemCallNumber);
        InventoryInstances.createInstanceViaApi(itemA2.instanceName, itemA2.itemBarcode, itemA2.publisher, itemA2.holdingCallNumber, itemA2.itemCallNumber);
      });
    });
  });

  beforeEach('Login to application', () => {
    cy.login(testData.user.username, testData.user.password, { path: TopMenu.inventoryPath, waiter: InventorySearchAndFilter.waitLoading });
  });

  after('Deleting user and instance', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemA1.itemBarcode);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemA2.itemBarcode);
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

  it('C359589 Verify that "Browse call numbers" result list displays all unique call numbers from one “Instance” record (spitfire)', { tags: [DevTeams.spitfire, TestTypes.criticalPath] }, () => {
    BrowseCallNumber.clickBrowseBtn();
    InventorySearchAndFilter.verifyKeywordsAsDefault();
    InventorySearchAndFilter.selectBrowseCallNumbers();
    InventoryActions.actionsIsAbsent();
    InventorySearchAndFilter.showsOnlyEffectiveLocation();
    InventorySearchAndFilter.browseSubjectsSearch(itemA1.itemCallNumber);
    BrowseCallNumber.checkExactSearchResult(itemA1.itemCallNumber);
  });

  it('C359593 Verify that clicking on "Call number" value execute search for "Instance" record by "Shelving order" value (spitfire)', { tags: [DevTeams.spitfire, TestTypes.criticalPath] }, () => {
    searchAndOpenInstance(testData.parameter, item.instanceName);
    InventoryInstance.addItem();
    InventoryInstance.fillItemRequiredFields();
    InventoryInstance.addItemData(item.callNumber, item.copyNumber, item.callNumberSuffix);
    InventoryInstance.addEnumerationData(item.volume, item.enumeration, item.chronology);
    InventoryInstance.saveItemDataAndVerifyExistence(item.copyNumber);
    search(item.callNumber);
    BrowseCallNumber.checkItemSearchResult(item.callNumber, item.callNumberSuffix);
    InventorySearchAndFilter.selectFoundItem(item.callNumber, item.callNumberSuffix);
    InventorySearchAndFilter.verifyShelvingOrder();
    InventorySearchAndFilter.verifyInstanceDisplayed(item.instanceName);
  });
});
