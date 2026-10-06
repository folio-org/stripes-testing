import {
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_SELECTED,
  RECEIPT_STATUS_VIEW,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../support/fragments/orders/basicOrderLine';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import UpdateReceivingWorkflowModal from '../../support/fragments/orders/modals/updateReceivingWorkflowModal';
import OrderStates from '../../support/fragments/orders/orderStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingDetails } from '../../support/fragments/receiving';
import DeletePieceModal from '../../support/fragments/receiving/modals/deletePieceModal';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const QUANTITY = 1;
  const RECEIVING_WORKFLOW_KEY = 'Receiving workflow';
  let testData;

  const checkPolReceiptStatusAndWorkflow = () => {
    OrderLineDetails.checkOrderLineDetails({
      poLineInformation: [
        {
          key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
          value: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED,
        },
        {
          key: POLINE_DETAILS_FIELDS.RECEIVING_WORKFLOW,
          value: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
        },
      ],
    });
  };

  const checkPolHasOnlyNewLocation = (key = POLINE_DETAILS_FIELDS.LOCATION_NAME) => {
    OrderLineDetails.checkLocationsSection({
      locations: [
        [
          { key, value: testData.newLocation.name },
          { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
        ],
      ],
    });
    OrderLineDetails.verifyLocationAbsentInSection(testData.firstLocation.name);
    OrderLineDetails.verifyLocationAbsentInSection(testData.secondLocation.name);
  };

  const openReceivingTitle = () => {
    OrderLines.receiveOrderLineViaActions();
    OrderLines.selectreceivedTitleName(testData.instanceTitle);
    ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
    ReceivingDetails.checkReceivingDetails({
      orderLineDetails: [
        {
          key: RECEIVING_WORKFLOW_KEY,
          value: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
        },
      ],
    });
  };

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C784585_FolioInstance_${getRandomPostfix()}`,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
      testData.materialType = mtypes[0];
    });
    cy.getAcquisitionMethodsApi().then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });
    // "Loc 1" and "Loc 2" are used on POL, "Loc 3" is selected while editing the POL
    Locations.getViaApiAnyDefault(3).then((locations) => {
      [testData.firstLocation, testData.secondLocation, testData.newLocation] = locations;
    });

    // Precondition 1: Open order with one POL (Synchronized workflow, Quantity = 2, Loc 1 and Loc 2)
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
            checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED],
            quantity: QUANTITY * 2,
          }),
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
            materialType: testData.materialType.id,
            materialSupplier: testData.organization.id,
            volumes: [],
          },
          locations: [
            {
              locationId: testData.firstLocation.id,
              quantity: QUANTITY,
              quantityPhysical: QUANTITY,
            },
            {
              locationId: testData.secondLocation.id,
              quantity: QUANTITY,
              quantityPhysical: QUANTITY,
            },
          ],
        };

        OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => {
          testData.orderLine = createdOrderLine;

          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    // Precondition 2: User with required permissions is logged in
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiReceivingViewEditDelete.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 3: User is on "Orders" app with search results for the order
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', testData.order.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitle);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C784585 Update receipt status to "Receipt not required" in an Open order (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C784585'] },
    () => {
      // Step 1: Open the order, open its PO line and select "Actions" -> "Edit"
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'receiptStatus',
          conditions: { checkedOptionText: RECEIPT_STATUS_VIEW.AWAITING_RECEIPT },
        },
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
            disabled: false,
          },
        },
      ]);
      OrderLineEditForm.checkLocationsSection([
        { label: 'quantityPhysical', index: 0, conditions: { disabled: true } },
        { label: 'quantityPhysical', index: 1, conditions: { disabled: true } },
      ]);
      OrderLineEditForm.checkReceivingRecordsMessage(true);

      // Step 2: Select "Receipt not required" option in the "Receipt status" dropdown
      OrderLineEditForm.fillOrderLineFields({
        receiptStatus: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED,
      });
      UpdateReceivingWorkflowModal.verifyModalView();

      // Step 3: Click "Confirm" button in the "Update receiving workflow" modal
      UpdateReceivingWorkflowModal.clickConfirmButton();
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'receiptStatus',
          conditions: { checkedOptionText: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED },
        },
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
            disabled: true,
          },
        },
      ]);
      // Stopped HERE
      OrderLineEditForm.checkLocationsSection([
        { label: 'quantityPhysical', index: 0, conditions: { disabled: false } },
        { label: 'quantityPhysical', index: 1, conditions: { disabled: false } },
      ]);
      OrderLineEditForm.checkReceivingRecordsMessage(false);

      // Step 4: Click "Save & close" button
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: true });
      OrderLineDetails.waitLoading();
      checkPolReceiptStatusAndWorkflow();

      // Step 5: Click "Actions" -> "Receive" and open the title related to the order
      openReceivingTitle();
      ReceivingDetails.verifyExpectedRecordsCount(2);

      // Step 6: Click on the piece record related to "Loc 1" and select "Delete" option
      ReceivingDetails.openEditPieceModal({ row: 0 });
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDeleteButton({ isLastPiece: false });

      // Step 7: Click "Delete" button in the "Delete piece" modal
      DeletePieceModal.confirmDelete({ pieceDeleted: true });
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 8: Click on the "POL number" link in the "POL details" accordion
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.firstLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
          ],
          [
            { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.secondLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
          ],
        ],
      });

      // Step 9: Click "Actions" -> "Edit" on the "PO Line details" pane
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'receiptStatus',
          conditions: { checkedOptionText: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED },
        },
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
            disabled: true,
          },
        },
      ]);

      // Step 10: Change quantity to 1, replace "Loc 1" and "Loc 2" with "Loc 3" and save
      OrderLineEditForm.fillCostDetails({ quantityPhysical: QUANTITY });
      OrderLineEditForm.removeLocationByIndex(0);
      OrderLineEditForm.removeLocationByIndex(0);
      OrderLines.openCreateHoldingForLocation();
      SelectLocationModal.selectLocation(testData.newLocation.name);
      OrderLines.setPhysicalQuantity({ quantity: `${QUANTITY}`, index: 0, changeQuantity: false });
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: true });
      OrderLineDetails.waitLoading();
      checkPolHasOnlyNewLocation();

      // Step 11: Click "Actions" -> "View PO", then "Actions" -> "Unopen" and "Submit"
      OrderLines.viewPO();
      OrderDetails.waitLoading();
      OrderDetails.unOpenOrder({
        orderNumber: testData.order.poNumber,
        hasRelations: false,
        submit: true,
      });
      InteractorsTools.checkCalloutMessage(
        OrderStates.orderUnopenedSuccessfully(testData.order.poNumber),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 12: Click on PO line record in "PO lines" accordion
      OrderLines.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();
      checkPolReceiptStatusAndWorkflow();
      checkPolHasOnlyNewLocation();

      // Step 13: Go back to the order, then "Actions" -> "Open" and "Submit"
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 14: Click on PO line record in "PO lines" accordion
      OrderLines.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();
      checkPolReceiptStatusAndWorkflow();
      checkPolHasOnlyNewLocation(POLINE_DETAILS_FIELDS.HOLDING_NAME);

      // Step 15: Click "Actions" -> "Receive" and open the title related to the order
      openReceivingTitle();
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 16: Open the piece record, select "Delete" option and confirm deletion
      ReceivingDetails.openEditPieceModal({ row: 0 });
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDeleteButton({ isLastPiece: true, hasItem: false });
      DeletePieceModal.clickDeletePieceButton({ pieceDeleted: true });
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(0);

      // Step 17: Click on the "POL number" link in the "POL details" accordion
      ReceivingDetails.openOrderLineDetails();
      checkPolReceiptStatusAndWorkflow();
      checkPolHasOnlyNewLocation(POLINE_DETAILS_FIELDS.HOLDING_NAME);

      // Step 18: Click "Title" link in "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(3);
      [testData.firstLocation, testData.secondLocation, testData.newLocation].forEach(
        (location) => {
          InventoryInstance.checkHoldingTitle({ title: location.name, count: 0 });
        },
      );
    },
  );
});
