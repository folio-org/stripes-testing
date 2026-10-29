import { ITEM_STATUS_NAMES } from '../../../support/constants';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
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
      cy.getUserToken(user.username, user.password, { log: false });
      cy.allure().logCommandSteps();

      // createInstanceViaApi hardcodes a "Main Library" location lookup (may not exist on a
      // dry-run env) and re-authenticates as a hardcoded "diku" admin login, overriding this
      // spec's own member-tenant/user context set up above - use the lower-level API helper
      // with a dynamically-fetched location instead, staying in the active tenant context
      cy.then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLocations({ limit: 1 }).then((location) => {
          testData.location = location;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          testData.materialTypeId = res.id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          testData.sourceId = folioSource.id;
        });
      }).then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            title: item.instanceName,
            instanceTypeId: testData.instanceTypeId,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.location.id,
              sourceId: testData.sourceId,
              callNumber: item.holdingCallNumber,
            },
          ],
          items: [
            {
              barcode: item.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
              itemLevelCallNumber: item.itemCallNumber,
            },
          ],
        });
      });
    });

    before('Login to application', () => {
      cy.allure().logCommandSteps(false);
      cy.login(
        user.username,
        user.password,
        {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
          authRefresh: true,
        },
        { log: false },
      );
      cy.allure().logCommandSteps();
    });

    after('Deleting user and instance', () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password, { log: false });
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
        cy.getUserToken(user.username, user.password, { log: false });
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
