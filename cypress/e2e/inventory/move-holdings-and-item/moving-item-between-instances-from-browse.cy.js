import InventoryInstances, {
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstancesMovement from '../../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';

describe('Inventory', () => {
  describe('Move holdings and item', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C411508_FolioInstance_${randomPostfix}`;
    const contributorValue = `AT_C411508_Contributor_${randomPostfix}`;
    const instanceTitles = [`${instanceTitle} A`, `${instanceTitle} B`];
    const testData = {
      folioInstancesA: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix: instanceTitles[0],
        holdingsCount: 1,
        itemsCount: 1,
      }),
      folioInstancesB: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix: instanceTitles[1],
        holdingsCount: 1,
        itemsCount: 0,
      }),
      barcodeOption: searchItemsOptions[1],
    };

    let barcode;
    let user;
    let locationA;
    let locationB;
    let contributorNameTypeId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411508');

      cy.then(() => {
        cy.getLocations({
          limit: 10,
          query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
        }).then(() => {
          locationA = Cypress.env('locations')[0];
          locationB = Cypress.env('locations')[1];
        });
        BrowseContributors.getContributorNameTypes().then((nameTypes) => {
          contributorNameTypeId = nameTypes[0].id;
        });
      })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstancesA,
            location: locationA,
          });
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstancesB,
            location: locationB,
          });
        })
        .then(() => {
          cy.getInstanceById(testData.folioInstancesA[0].instanceId).then((body) => {
            const requestBody = { ...body };
            requestBody.contributors = [
              {
                name: contributorValue,
                contributorNameTypeId,
                contributorTypeId: null,
                contributorTypeText: '',
                primary: true,
              },
            ];
            cy.updateInstance(requestBody);
          });
          barcode = testData.folioInstancesA[0].items[0].barcode;
        })
        .then(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiInventoryMoveItems.gui,
          ]).then((userProperties) => {
            user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.folioInstancesA[0].instanceId,
      );
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.folioInstancesB[0].instanceId,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C411508 Verify that "Move holdings/items to another instance" option works as expected when opening record from Browse (spitfire)',
      {
        tags: ['extendedPath', 'spitfire', 'C411508'],
      },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();

        BrowseContributors.waitForContributorToAppear(contributorValue);

        BrowseContributors.select();
        BrowseContributors.browse(contributorValue);
        BrowseContributors.checkSearchResultsTable();
        BrowseContributors.checkSearchResultRecord(contributorValue);

        BrowseContributors.openInstance({ name: contributorValue });
        InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
        InventoryInstance.waitLoading();

        InventoryInstance.moveItemToAnotherInstance({
          fromHolding: locationA.name,
          toInstance: instanceTitles[1],
          shouldOpen: true,
        });
        InventoryInstancesMovement.verifyHoldingsMoved(locationB.name, '1');

        InventoryInstance.openHoldings(locationB.name);
        InventoryInstancesMovement.verifyItemBarcodeInHoldings(barcode, locationB.name);

        InventoryInstancesMovement.closeInLeftForm();
        InventoryInstance.waitLoading();

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(testData.barcodeOption, barcode);
        ItemRecordView.checkBarcode(barcode);
        ItemRecordView.checkInstanceTitle(instanceTitles[1]);
      },
    );
  });
});
