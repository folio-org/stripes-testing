import permissions from '../../../support/dictionary/permissions';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
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
      effectiveItemCallNumberWithSuffix: 'itemFullCallNumbers="PRT 718 suf"',
      effectiveItemCallNumber: 'itemFullCallNumbers="RR 718"',
      querySearchOption: 'Query search',
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

    const notExistingCallNumber = `callNumber_${getRandomPostfix()}`;

    const barcodes = [];
    const itemCallNumbers = [];
    const instances = [];

    const createTestInstances = () => {
      for (let i = 0; i < 10; i++) {
        barcodes.push(`barcode_${getRandomPostfix()}`);
        itemCallNumbers.push(`itemCallNumbers_${getRandomPostfix()}`);
        instances.push(`instances_${getRandomPostfix()}`);
      }
    };

    const search = (query) => {
      BrowseCallNumber.clickBrowseBtn();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      InventorySearchAndFilter.selectBrowseCallNumbers();
      InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
      InventoryActions.actionsIsAbsent();
      InventorySearchAndFilter.showsOnlyEffectiveLocation();
      InventorySearchAndFilter.browseSubjectsSearch(query);
    };

    before('Creating user and instance with item with call number', () => {
      cy.getAdminToken().then(() => {
        cy.createTempUser([permissions.inventoryAll.gui, permissions.uiCallNumberBrowse.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            createTestInstances();

            for (let i = 0; i < 10; i++) {
              InventoryInstances.createInstanceViaApi(
                instances[i],
                barcodes[i],
                null,
                '1',
                itemCallNumbers[i],
              );
            }
            InventoryInstances.createInstanceViaApi(
              item.instanceName,
              item.itemBarcode,
              item.publisher,
              item.holdingCallNumber,
              item.itemCallNumber,
            );
            InventoryInstances.createInstanceViaApi(
              itemA1.instanceName,
              itemA1.itemBarcode,
              itemA1.publisher,
              itemA1.holdingCallNumber,
              itemA1.itemCallNumber,
            );
            InventoryInstances.createInstanceViaApi(
              itemA2.instanceName,
              itemA2.itemBarcode,
              itemA2.publisher,
              itemA2.holdingCallNumber,
              itemA2.itemCallNumber,
            );
          },
        );
      });
    });

    beforeEach('Login to application', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
        authRefresh: true,
      });
    });

    after('Deleting user and instance', () => {
      cy.getAdminToken();
      barcodes.forEach((barcode) => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(barcode);
      });
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemA1.itemBarcode);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemA2.itemBarcode);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C358140 Verify that browsing for "call number" with "space" value will get the correct result (spitfire)',
      { tags: ['smoke', 'spitfire', 'shiftLeft', 'C358140'] },
      () => {
        BrowseCallNumber.waitForCallNumberToAppear(testData.exactSearch);
        search(testData.exactSearch);
        BrowseCallNumber.checkExactSearchResult(testData.exactSearch);
        BrowseContributors.resetAllInSearchPane();
        search(testData.itemWithoutSpace);
        BrowseCallNumber.checkExactSearchResult(testData.exactSearch);
        BrowseContributors.resetAllInSearchPane();
        search(testData.itemWithLowerCaseR);
        BrowseCallNumber.checkExactSearchResult(testData.exactSearch);
      },
    );

    it(
      'C359589 Verify that "Browse call numbers" result list displays all unique call numbers from one “Instance” record (spitfire)',
      { tags: ['spitfire', 'criticalPath', 'C359589', 'eurekaPhase1'] },
      () => {
        BrowseCallNumber.clickBrowseBtn();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventoryActions.actionsIsAbsent();
        InventorySearchAndFilter.showsOnlyEffectiveLocation();
        BrowseCallNumber.waitForCallNumberToAppear(itemA1.itemCallNumber);
        InventorySearchAndFilter.browseSubjectsSearch(itemA1.itemCallNumber);
        BrowseCallNumber.checkExactSearchResult(itemA1.itemCallNumber);
      },
    );

    it(
      'C347910 Verify that "Actions" menu is displayed when searching by any search option except "Call numbers" (spitfire)',
      { tags: ['spitfire', 'criticalPath', 'C347910', 'eurekaPhase1'] },
      () => {
        BrowseCallNumber.clickBrowseBtn();
        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventoryActions.actionsIsAbsent();
        InventorySearchAndFilter.showsOnlyEffectiveLocation();
        BrowseCallNumber.waitForCallNumberToAppear(itemA1.itemCallNumber);
        InventorySearchAndFilter.browseSubjectsSearch(itemA1.itemCallNumber);
        BrowseCallNumber.checkExactSearchResult(itemA1.itemCallNumber);
        BrowseCallNumber.clickOnResult(itemA1.itemCallNumber);
        InventorySearchAndFilter.verifyActionButtonOptions();
      },
    );

    it(
      'C347916 Verify Browse with non-existent call number (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C347916', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyBrowseOptions();
        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventorySearchAndFilter.browseSubjectsSearch(notExistingCallNumber);
        BrowseCallNumber.checkNotExistingCallNumber(notExistingCallNumber);
        BrowseCallNumber.checkNotClickableResult(notExistingCallNumber);
        InventorySearchAndFilter.clickResetAllButton();
      },
    );

    it(
      'C347918 Verify selecting row from browse result list (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C347918', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyBrowseOptions();
        InventorySearchAndFilter.selectBrowseCallNumbers();
        BrowseCallNumber.waitForCallNumberToAppear(item.itemCallNumber);
        InventorySearchAndFilter.browseSubjectsSearch(item.itemCallNumber);
        InventorySearchAndFilter.selectFoundItem(item.itemCallNumber);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(item.querySearchOption);
        InventorySearchAndFilter.checkSearchQueryText(item.effectiveItemCallNumber);
        InventorySearchAndFilter.verifyInstanceDisplayed(item.instanceName);

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.clickResetAllButton();
      },
    );
  });
});
