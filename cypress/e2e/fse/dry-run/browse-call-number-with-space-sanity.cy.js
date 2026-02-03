import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../support/utils/users';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const { user, memberTenant } = parseSanityParameters();

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

    const testData = {
      exactSearch: item.itemCallNumber,
      itemWithoutSpace: 'RR718',
      itemWithLowerCaseR: 'Rr 718',
      parameter: 'Keyword (title, contributor, identifier, HRID, UUID)',
    };

    const barcodes = [];

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
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();

      InventoryInstances.createInstanceViaApi(
        item.instanceName,
        item.itemBarcode,
        item.publisher,
        item.holdingCallNumber,
        item.itemCallNumber,
      );
    });

    before('Login to application', () => {
      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
        authRefresh: true,
      });
      cy.allure().logCommandSteps();
    });

    after('Deleting user and instance', () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();
      barcodes.forEach((barcode) => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(barcode);
      });
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    });

    it(
      'C358140 Verify that browsing for "call number" with "space" value will get the correct result (spitfire)',
      { tags: ['dryRun', 'spitfire', 'C358140'] },
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
  });
});
