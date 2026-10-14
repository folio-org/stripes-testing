import {
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
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
import {
  ReceivingDetails,
  Receivings,
  ReceivingsListEditForm,
} from '../../../support/fragments/receiving';
import EditPieceModal from '../../../support/fragments/receiving/modals/editPieceModal';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import { Locations } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const testData = {
      holdings: [],
    };

    before('Create test data', () => {
      testData.instanceTitle = `AT_C729183_FolioInstance_${getRandomPostfix()}`;
      testData.organization = {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C729183_Organization_${getRandomPostfix()}`,
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

      Locations.getViaApiAnyDefault(3).then((locations) => {
        [testData.firstLocation, testData.secondLocation, testData.thirdLocation] = locations;

        InventoryInstance.createInstanceViaApi({
          instanceTitle: testData.instanceTitle,
        }).then(({ instanceData }) => {
          testData.instance = instanceData;

          InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
            (holdingSources) => {
              [testData.firstLocation, testData.secondLocation, testData.thirdLocation].forEach(
                (location, index) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: testData.instance.instanceId,
                    permanentLocationId: location.id,
                    sourceId: holdingSources[0].id,
                  }).then((holding) => {
                    testData.holdings[index] = holding;
                  });
                },
              );
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
              checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED],
              quantity: 2,
            }),
            orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
            physical: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
              materialType: testData.materialType.id,
              materialSupplier: testData.organization.id,
              volumes: [],
            },
            locations: [
              {
                holdingId: testData.holdings[0].id,
                quantity: 1,
                quantityPhysical: 1,
              },
              {
                holdingId: testData.holdings[1].id,
                quantity: 1,
                quantityPhysical: 1,
              },
            ],
          };

          OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => {
            testData.orderLine = createdOrderLine;
            Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
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

      // Precondition: receive all pieces via UI
      cy.then(() => {
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.selectFromResultsList(testData.order.poNumber);
        OrderLines.selectPOLInOrder(0);
        OrderLines.receiveOrderLineViaActions();
        Receivings.selectFromResultsList(testData.instanceTitle);
        ReceivingDetails.openReceiveListEditForm();
        ReceivingsListEditForm.receiveAll();
        ReceivingDetails.waitLoading();
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
      'C729183 Update synchronized PO line when move received items to another holding (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C729183'] },
      () => {
        // Step 1: Navigate to Inventory from POL, verify three holdings
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.searchByParameter('PO number', testData.order.poNumber);
        Orders.selectFromResultsList(testData.order.poNumber);
        OrderLines.selectPOLInOrder(0);
        OrderLineDetails.openInventoryItem();
        InventoryInstance.verifyHoldingsAccordionsCount(3);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.firstLocation.name,
          records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
        });
        InventoryInstance.checkHoldingsTableContent({
          name: testData.secondLocation.name,
          records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
        });
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.thirdLocation.name, 0);

        // Step 2: Actions > Move items within an instance
        InventoryInstance.openMoveItemsWithinAnInstance();

        // Step 3: Move item from Loc1 to Loc3
        InventoryInstance.moveItemToAnotherHolding({
          fromHolding: testData.firstLocation.name,
          toHolding: testData.thirdLocation.name,
          shouldOpen: false,
          itemMoved: true,
        });
        InventoryInstance.openHoldings(testData.firstLocation.name);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.firstLocation.name, 0);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.secondLocation.name,
          records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
          shouldOpen: false,
        });
        InventoryInstance.checkHoldingsTableContent({
          name: testData.thirdLocation.name,
          records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
          shouldOpen: true,
        });
        // Step 4: Move item from Loc2 to Loc3
        InventoryInstance.moveItemToAnotherHolding({
          fromHolding: testData.secondLocation.name,
          toHolding: testData.thirdLocation.name,
          shouldOpen: false,
          itemMoved: true,
        });
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.firstLocation.name, 0);
        InventoryInstance.openHoldings(testData.secondLocation.name);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.secondLocation.name, 0);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.thirdLocation.name,
          records: [
            { status: ITEM_STATUS_NAMES.IN_PROCESS },
            { status: ITEM_STATUS_NAMES.IN_PROCESS },
          ],
          shouldOpen: true,
        });

        // Step 5: Click POL link in Acquisition accordion, verify only Loc3 in locations
        InventoryInstance.clickAcquisitionOrderLineLink(testData.orderLine.poLineNumber);
        OrderLineDetails.checkOrderLineDetails({
          locationDetails: {
            locations: [
              [
                { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.thirdLocation.name },
                { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '2' },
              ],
            ],
          },
        });
        OrderLineDetails.verifyLocationAbsentInSection(testData.firstLocation.name);
        OrderLineDetails.verifyLocationAbsentInSection(testData.secondLocation.name);

        // Step 6: Actions > Receive, verify each piece shows Loc3
        OrderLines.receiveOrderLineViaActions();
        Receivings.selectFromResultsList(testData.instanceTitle);
        ReceivingDetails.assertReceivedPiecesTotalCount(2);

        ReceivingDetails.openEditPieceModal({ row: 0, section: 'Received' });
        EditPieceModal.checkFieldsConditions([
          {
            label: RECEIVING_PIECE_FORM_FIELD_LABELS.ORDER_LINE_LOCATIONS,
            conditions: { value: testData.thirdLocation.name },
          },
        ]);
        EditPieceModal.verifySelectedHolding(testData.thirdLocation.name, { isEditable: false });
        EditPieceModal.clickCancelButton();

        ReceivingDetails.openEditPieceModal({ row: 1, section: 'Received' });
        EditPieceModal.checkFieldsConditions([
          {
            label: RECEIVING_PIECE_FORM_FIELD_LABELS.ORDER_LINE_LOCATIONS,
            conditions: { value: testData.thirdLocation.name },
          },
        ]);
        EditPieceModal.verifySelectedHolding(testData.thirdLocation.name, { isEditable: false });
        EditPieceModal.clickCancelButton();

        // Step 7: Click title link, verify holdings state
        ReceivingDetails.openInstanceDetails();
        InventoryInstance.verifyHoldingsAccordionsCount(3);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.firstLocation.name, 0);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.secondLocation.name, 0);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.thirdLocation.name,
          records: [
            { status: ITEM_STATUS_NAMES.IN_PROCESS },
            { status: ITEM_STATUS_NAMES.IN_PROCESS },
          ],
        });

        // Step 8: Move items, move both items from Loc3 to Loc1 (two separate moves)
        InventoryInstance.openMoveItemsWithinAnInstance();
        InventoryInstance.moveItemToAnotherHolding({
          fromHolding: testData.thirdLocation.name,
          toHolding: testData.firstLocation.name,
          shouldOpen: false,
          itemMoved: true,
        });
        InventoryInstance.moveItemToAnotherHolding({
          fromHolding: testData.thirdLocation.name,
          toHolding: testData.firstLocation.name,
          shouldOpen: false,
          itemMoved: true,
        });
        InventoryInstance.checkHoldingsTableContent({
          name: testData.firstLocation.name,
          records: [
            { status: ITEM_STATUS_NAMES.IN_PROCESS },
            { status: ITEM_STATUS_NAMES.IN_PROCESS },
          ],
          shouldOpen: true,
        });
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.secondLocation.name, 0);
        InventoryInstance.openHoldings(testData.thirdLocation.name);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.thirdLocation.name, 0);

        // Step 9: Click POL link, verify only Loc1 in locations
        InventoryInstance.clickAcquisitionOrderLineLink(testData.orderLine.poLineNumber);
        OrderLineDetails.checkOrderLineDetails({
          locationDetails: {
            locations: [
              [
                { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.firstLocation.name },
                { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '2' },
              ],
            ],
          },
        });
        OrderLineDetails.verifyLocationAbsentInSection(testData.secondLocation.name);
        OrderLineDetails.verifyLocationAbsentInSection(testData.thirdLocation.name);

        // Step 10: Actions > Receive, click title, verify 2 received pieces
        OrderLines.receiveOrderLineViaActions();
        Receivings.selectFromResultsList(testData.instanceTitle);
        ReceivingDetails.assertReceivedPiecesTotalCount(2);

        // Step 11: Each piece shows Loc1 in Order line locations and Select holdings
        ReceivingDetails.openEditPieceModal({ row: 0, section: 'Received' });
        EditPieceModal.checkFieldsConditions([
          {
            label: RECEIVING_PIECE_FORM_FIELD_LABELS.ORDER_LINE_LOCATIONS,
            conditions: { value: testData.firstLocation.name },
          },
        ]);
        EditPieceModal.verifySelectedHolding(testData.firstLocation.name, { isEditable: false });
        EditPieceModal.clickCancelButton();

        ReceivingDetails.openEditPieceModal({ row: 1, section: 'Received' });
        EditPieceModal.checkFieldsConditions([
          {
            label: RECEIVING_PIECE_FORM_FIELD_LABELS.ORDER_LINE_LOCATIONS,
            conditions: { value: testData.firstLocation.name },
          },
        ]);
        EditPieceModal.verifySelectedHolding(testData.firstLocation.name, { isEditable: false });
        EditPieceModal.clickCancelButton();

        // Step 12: Click title link, verify holdings state
        ReceivingDetails.openInstanceDetails();
        InventoryInstance.verifyHoldingsAccordionsCount(3);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.firstLocation.name,
          records: [
            { status: ITEM_STATUS_NAMES.IN_PROCESS },
            { status: ITEM_STATUS_NAMES.IN_PROCESS },
          ],
        });
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.secondLocation.name, 0);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.thirdLocation.name, 0);

        // Step 13: Move items, move both items from Loc1 to Loc3 (two separate moves)
        InventoryInstance.openMoveItemsWithinAnInstance();
        InventoryInstance.moveItemToAnotherHolding({
          fromHolding: testData.firstLocation.name,
          toHolding: testData.thirdLocation.name,
          shouldOpen: false,
          itemMoved: true,
        });
        InventoryInstance.moveItemToAnotherHolding({
          fromHolding: testData.firstLocation.name,
          toHolding: testData.thirdLocation.name,
          shouldOpen: false,
          itemMoved: true,
        });
        InventoryInstance.openHoldings(testData.firstLocation.name);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.firstLocation.name, 0);
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.secondLocation.name, 0);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.thirdLocation.name,
          records: [
            { status: ITEM_STATUS_NAMES.IN_PROCESS },
            { status: ITEM_STATUS_NAMES.IN_PROCESS },
          ],
          shouldOpen: true,
        });

        // Step 14: Click POL link, verify only Loc3 in locations
        InventoryInstance.clickAcquisitionOrderLineLink(testData.orderLine.poLineNumber);
        OrderLineDetails.checkOrderLineDetails({
          locationDetails: {
            locations: [
              [
                { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.thirdLocation.name },
                { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '2' },
              ],
            ],
          },
        });
        OrderLineDetails.verifyLocationAbsentInSection(testData.firstLocation.name);
        OrderLineDetails.verifyLocationAbsentInSection(testData.secondLocation.name);

        // Step 15: Actions > Receive, click title, each piece shows Loc3
        OrderLines.receiveOrderLineViaActions();
        Receivings.selectFromResultsList(testData.instanceTitle);
        ReceivingDetails.assertReceivedPiecesTotalCount(2);

        ReceivingDetails.openEditPieceModal({ row: 0, section: 'Received' });
        EditPieceModal.checkFieldsConditions([
          {
            label: RECEIVING_PIECE_FORM_FIELD_LABELS.ORDER_LINE_LOCATIONS,
            conditions: { value: testData.thirdLocation.name },
          },
        ]);
        EditPieceModal.verifySelectedHolding(testData.thirdLocation.name, { isEditable: false });
        EditPieceModal.clickCancelButton();

        ReceivingDetails.openEditPieceModal({ row: 1, section: 'Received' });
        EditPieceModal.checkFieldsConditions([
          {
            label: RECEIVING_PIECE_FORM_FIELD_LABELS.ORDER_LINE_LOCATIONS,
            conditions: { value: testData.thirdLocation.name },
          },
        ]);
        EditPieceModal.verifySelectedHolding(testData.thirdLocation.name, { isEditable: false });
        EditPieceModal.clickCancelButton();
      },
    );
  });
});
