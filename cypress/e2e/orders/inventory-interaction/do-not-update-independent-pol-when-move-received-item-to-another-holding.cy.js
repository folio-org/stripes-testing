import { including } from '../../../../interactors';
import {
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../../support/fragments/orders/basicOrderLine';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { ReceivingDetails, Receivings } from '../../../support/fragments/receiving';
import EditPieceModal from '../../../support/fragments/receiving/modals/editPieceModal';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import { Locations } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const testData = {
      holdings: [],
    };

    before('Create test data', () => {
      testData.instanceTitle = `AT_C729184_FolioInstance_${getRandomPostfix()}`;
      testData.organization = {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C729184_Organization_${getRandomPostfix()}`,
      };

      cy.clearLocalStorage();
      cy.getAdminToken();

      MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
        testData.materialType = mtypes[0];
      });
      cy.getAcquisitionMethodsApi().then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
      Organizations.createOrganizationViaApi(testData.organization).then(() => {});

      Locations.getViaApiAnyDefault(2).then((locations) => {
        [testData.firstLocation, testData.secondLocation] = locations;

        InventoryInstance.createInstanceViaApi({
          instanceTitle: testData.instanceTitle,
        }).then(({ instanceData }) => {
          testData.instance = instanceData;

          InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
            (holdingSources) => {
              [testData.firstLocation, testData.secondLocation].forEach((location, index) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: testData.instance.instanceId,
                  permanentLocationId: location.id,
                  sourceId: holdingSources[0].id,
                }).then((holding) => {
                  testData.holdings[index] = holding;
                });
              });
            },
          );
        });
      });

      cy.then(() => {
        Orders.createOrderViaApi(
          NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        ).then((order) => {
          testData.order = order;

          const orderLine = {
            ...BasicOrderLine.getDefaultOrderLine({
              title: testData.instanceTitle,
              purchaseOrderId: order.id,
              acquisitionMethod: testData.acquisitionMethod.id,
              instanceId: testData.instance.instanceId,
              checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.INDEPENDENT],
              quantity: 2,
            }),
            orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
            physical: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
              materialType: testData.materialType.id,
              materialSupplier: testData.organization.id,
              volumes: [],
            },
            locations: testData.holdings.map((holding) => ({
              holdingId: holding.id,
              quantity: 1,
              quantityPhysical: 1,
            })),
          };

          OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => {
            testData.orderLine = createdOrderLine;

            Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN }).then(() => {
              // Precondition: add one piece with item to each holding, then receive all pieces
              testData.holdings.forEach((holding) => {
                Receivings.addPieceViaApi({
                  poLineId: testData.orderLine.id,
                  poLineNumber: testData.orderLine.poLineNumber,
                  format: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
                  holdingId: holding.id,
                  searchParams: { createItem: 'true' },
                });
              });
              Receivings.getPiecesViaApi(testData.orderLine.id).then((pieces) => {
                Receivings.receivePieceViaApi({
                  poLineId: testData.orderLine.id,
                  pieces: pieces.map(({ id }) => ({ id })),
                });
              });
            });
          });
        });
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiInventoryMoveItems.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C729184 Do not update independent PO line when move received item to another holding (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C729184'] },
      () => {
        // Step 1: Navigate to Inventory from POL, verify each holding contains one item
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.selectFromResultsList(testData.order.poNumber);
        OrderLines.selectPOLInOrder(0);
        OrderLineDetails.openInventoryItem();
        InventoryInstance.verifyHoldingsAccordionsCount(2);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.firstLocation.name,
          records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
        });
        InventoryInstance.checkHoldingsTableContent({
          name: testData.secondLocation.name,
          records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
        });

        // Step 2: Actions > Move items within an instance
        InventoryInstance.openMoveItemsWithinAnInstance();

        // Step 3: Drag item from Loc1 to Loc2
        InventoryInstance.moveItemToAnotherHolding({
          fromHolding: testData.firstLocation.name,
          toHolding: testData.secondLocation.name,
          shouldOpen: false,
          itemMoved: true,
        });
        InventoryInstance.openHoldings(testData.firstLocation.name);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.firstLocation.name, 0);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.secondLocation.name,
          records: [
            { status: ITEM_STATUS_NAMES.IN_PROCESS },
            { status: ITEM_STATUS_NAMES.IN_PROCESS },
          ],
          shouldOpen: true,
        });

        // Step 4: Click POL link in Acquisition accordion, verify both locations remain in POL
        InventoryInstance.clickAcquisitionOrderLineLink(testData.orderLine.poLineNumber);
        OrderLineDetails.verifyLocationPresentInSection(testData.firstLocation.name);
        OrderLineDetails.verifyLocationPresentInSection(testData.secondLocation.name);
        OrderLineDetails.checkOrderLineDetails({
          locationDetails: {
            locations: [
              [{ key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: 1 }],
              [{ key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: 1 }],
            ],
          },
        });

        // Step 5: Actions > Receive, click title, verify 2 received pieces
        OrderLines.receiveOrderLineViaActions();
        Receivings.selectFromResultsList(testData.instanceTitle);
        ReceivingDetails.assertReceivedPiecesTotalCount(2);

        // Steps 6-7: Each piece shows Loc1 and Loc2 in Order line locations
        // and non-editable Loc2 in Select holdings
        [0, 1].forEach((row) => {
          ReceivingDetails.openEditPieceModal({ row, section: 'Received' });
          EditPieceModal.checkFieldsConditions([
            {
              label: RECEIVING_PIECE_FORM_FIELD_LABELS.ORDER_LINE_LOCATIONS,
              conditions: { value: including(testData.firstLocation.name) },
            },
            {
              label: RECEIVING_PIECE_FORM_FIELD_LABELS.ORDER_LINE_LOCATIONS,
              conditions: { value: including(testData.secondLocation.name) },
            },
          ]);
          EditPieceModal.verifySelectedHolding(testData.secondLocation.name, { isEditable: false });
          EditPieceModal.clickCancelButton();
        });
      },
    );
  });
});
