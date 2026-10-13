import {
  CHANGE_INSTANCE_HOLDINGS_OPERATIONS,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { InventoryInstance, InventoryInstances } from '../../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../../support/fragments/orders/basicOrderLine';
import ChangeInstanceModal from '../../../support/fragments/orders/modals/changeInstanceModal';
import DeleteHoldingsModal from '../../../support/fragments/orders/modals/deleteHoldingsModal';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { Receivings } from '../../../support/fragments/receiving';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import { Locations } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const testData = {};

    before('Create test data', () => {
      testData.organization = {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C359150_Organization_${getRandomPostfix()}`,
      };

      testData.orderLineInstanceTitle = `AT_C359150_FolioInstance_first_${getRandomPostfix()}`;

      cy.clearLocalStorage();
      cy.getAdminToken();
      MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
        testData.materialType = mtypes[0];
      });
      cy.getAcquisitionMethodsApi().then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
      Locations.getViaApiAnyDefault(2).then((locations) => {
        [testData.firstLocation, testData.secondLocation] = locations;
      });
      // Instance #1 — target for instance connection change (no holdings)
      InventoryInstance.createInstanceViaApi({
        instanceTitle: `AT_C359150_FolioInstance_${getRandomPostfix()}`,
      }).then(({ instanceData }) => {
        testData.instance = instanceData;
      });
      Organizations.createOrganizationViaApi(testData.organization).then(() => {});

      cy.then(() => {
        const checkinItems = CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.INDEPENDENT];

        Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        ).then((order) => {
          testData.order = order;

          OrderLines.createOrderLineViaApi({
            ...BasicOrderLine.getDefaultOrderLine({
              title: testData.orderLineInstanceTitle,
              purchaseOrderId: order.id,
              acquisitionMethod: testData.acquisitionMethod.id,
              checkinItems,
            }),
            orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
            cost: {
              currency: 'USD',
              discountType: 'percentage',
              listUnitPrice: 10,
              listUnitPriceElectronic: 10,
              quantityPhysical: 1,
              quantityElectronic: 1,
            },
            locations: [
              {
                locationId: testData.firstLocation.id,
                quantityPhysical: 1,
                quantityElectronic: 0,
              },
              {
                locationId: testData.firstLocation.id,
                quantityPhysical: 0,
                quantityElectronic: 1,
              },
            ],
            physical: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
              materialType: testData.materialType.id,
              materialSupplier: testData.organization.id,
              volumes: [],
            },
            eresource: {
              activated: false,
              trial: false,
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
              materialType: testData.materialType.id,
              accessProvider: testData.organization.id,
            },
          }).then((createdOrderLine) => {
            testData.orderLine = createdOrderLine;

            Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN }).then(() => {
              // Add two physical pieces at secondLocation — reuse the holding created by the first piece
              Receivings.addPieceViaApi(
                {
                  poLineId: testData.orderLine.id,
                  poLineNumber: testData.orderLine.poLineNumber,
                  format: ORDER_FORMAT_VALUES.PE_MIX,
                  searchParams: { createItem: 'true' },
                },
                { locationId: testData.secondLocation.id },
              ).then(({ body: firstPiece }) => {
                Receivings.addPieceViaApi({
                  poLineId: testData.orderLine.id,
                  poLineNumber: testData.orderLine.poLineNumber,
                  format: ORDER_FORMAT_VALUES.PE_MIX,
                  holdingId: firstPiece.holdingId,
                  searchParams: { createItem: 'true' },
                }).then(() => {
                  // Receive all created pieces
                  Receivings.getPiecesViaApi(testData.orderLine.id).then((allPieces) => {
                    Receivings.receivePieceViaApi({
                      poLineId: testData.orderLine.id,
                      pieces: allPieces.map((p) => ({ id: p.id })),
                    });
                  });
                });
              });
            });
          });
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.inventoryCRUDHoldings.gui,
        Permissions.uiInventoryViewCreateEditDeleteItems.gui,
        Permissions.uiOrdersApprovePurchaseOrders.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiOrdersView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.orderLineInstanceTitle);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C359150 Both POL details and UUID are updated when Changing instance, items are appearing ("P/E mix" order format) (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C359150'] },
      () => {
        // Step 1: Click on the order from Preconditions
        Orders.selectOrderByPONumber(testData.order.poNumber);

        // Step 2: Click on PO line record → Actions → Change instance connection
        OrderDetails.openPolDetails(testData.orderLineInstanceTitle);
        OrderLineDetails.changeInstanceConnection();

        // Step 3: Search for Instance #1 and click on it
        SelectInstanceModal.searchByName(testData.instance.instanceTitle);
        SelectInstanceModal.selectInstance({ shouldConfirm: true });

        // Step 4: Select "Find or create new" in Holdings dropdown → Submit → Delete Holdings popup appears
        ChangeInstanceModal.selectHoldingOperation({
          operation: CHANGE_INSTANCE_HOLDINGS_OPERATIONS.FIND_OR_CREATE_NEW,
          shouldConfirm: false,
        });
        ChangeInstanceModal.clickSubmitButton({ updated: false });
        DeleteHoldingsModal.verifyModalView();

        // Step 5: Click "Keep holdings" → success notification, Instance #1 in Item details
        DeleteHoldingsModal.clickKeepHoldingsButton();
        OrderLineDetails.checkOrderLineDetails({
          itemDetails: [
            { key: POLINE_DETAILS_FIELDS.TITLE, value: testData.instance.instanceTitle },
          ],
        });

        // Step 6: Scroll to Location accordion → both physical and electronic holdings at firstLocation
        OrderLineDetails.checkLocationsSection({
          locations: [
            [
              { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.firstLocation.name },
              { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' },
            ],
          ],
        });
        OrderLineDetails.checkLocationsSection({
          locations: [
            [
              { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.firstLocation.name },
              { key: POLINE_DETAILS_FIELDS.QUANTITY_ELECTRONIC, value: '1' },
            ],
          ],
        });

        // Step 7: Click Title link → Inventory shown with two holdings in Instance #1; received items in secondLocation
        OrderLineDetails.openInventoryItem();
        InventoryInstance.checkInstanceTitle(testData.instance.instanceTitle);
        InventoryInstance.verifyHoldingsAccordionsCount(2);
        InventoryInstance.checkHoldingTitle({ title: testData.firstLocation.name });
        InventoryInstance.checkHoldingTitle({ title: testData.secondLocation.name });
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.secondLocation.name, 2);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.firstLocation.name, 0);

        // Step 8: Search for original order title → instance has three holdings without items
        InventoryInstances.searchByTitle(testData.orderLineInstanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.checkInstanceTitle(testData.orderLineInstanceTitle);
        InventoryInstance.verifyHoldingsAccordionsCount(3);
        InventoryInstance.checkHoldingTitle({ title: testData.firstLocation.name, count: 0 });
        InventoryInstance.checkHoldingTitle({ title: testData.secondLocation.name, count: 0 });
      },
    );
  });
});
