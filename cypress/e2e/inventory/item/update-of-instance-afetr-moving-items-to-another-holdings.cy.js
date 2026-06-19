import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const testData = {
      instanceTitle: `AT_C466124_FolioInstance_${getRandomPostfix()}`,
      firstHoldingsLocation: LOCATION_NAMES.ANNEX_UI,
      secondHoldingsLocation: LOCATION_NAMES.MAIN_LIBRARY_UI,
      itemBarcode: generateItemBarcode(),
    };

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            testData.instanceTypeId = instanceTypeData[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${testData.firstHoldingsLocation}"` }).then((res) => {
            testData.firstLocationId = res.id;
          });
          cy.getLocations({ query: `name="${testData.secondHoldingsLocation}"` }).then((res) => {
            testData.secondLocationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            testData.materialTypeId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            testData.sourceId = folioSource.id;
          });
        })
        .then(() => {
          // create the first instance with holding and item
          cy.createInstance({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.firstLocationId,
                sourceId: testData.sourceId,
              },
            ],
            items: [
              [
                {
                  barcode: testData.itemBarcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
              ],
            ],
          }).then((instanceId) => {
            testData.instanceId = instanceId;

            // create the second holding without item for moving items
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.instanceId,
              permanentLocationId: testData.secondLocationId,
              sourceId: testData.sourceId,
            });
          });
        });

      cy.createTempUser([
        Permissions.uiInventoryMoveItems.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditDeleteItems.gui,
        Permissions.uiInventoryMarkAsMissing.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C423972 Verify instance metadata is updated after moving item to another holdings (folijet)',
      { tags: ['extendedPath', 'folijet', 'C423972'] },
      () => {
        // Find pre-created instance and check initial item placement.
        InventorySearchAndFilter.searchInstanceByTitle(testData.instanceTitle);
        InventoryInstance.checkIsHoldingsCreated([
          `${testData.firstHoldingsLocation} >`,
          `${testData.secondHoldingsLocation} >`,
        ]);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.firstHoldingsLocation,
          records: [{ barcode: testData.itemBarcode, status: 'Available' }],
        });
        InstanceRecordView.verifyItemsListIsEmpty(testData.secondHoldingsLocation);

        // Move one item within the same instance to a different holdings.
        InventoryInstance.openMoveItemsWithinAnInstance();
        InventoryInstance.moveItemToAnotherHolding({
          fromHolding: testData.firstHoldingsLocation,
          toHolding: testData.secondHoldingsLocation,
          shouldOpen: false,
          itemMoved: true,
        });
        InstanceRecordView.verifyItemsListIsEmptyAfterMoving(testData.firstHoldingsLocation, false);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.secondHoldingsLocation,
          records: [{ barcode: testData.itemBarcode, status: ITEM_STATUS_NAMES.AVAILABLE }],
          columnIndex: 2,
          shouldOpen: true,
        });
      },
    );
  });
});
