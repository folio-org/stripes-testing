import {
  ORDER_FORMAT_VALUES,
  ORDER_LINE_FORM_MESSAGES,
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
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import {
  BasicOrderLine,
  NewOrder,
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
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import {
  ReceivingDetails,
  Receivings,
  ReceivingsListEditForm,
} from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const QUANTITY = 1;
  let testData;

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C784510_FolioInstance_${getRandomPostfix()}`,
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
    // "Loc 1" is used on POL, "Loc 2" is selected while adding a piece
    Locations.getViaApiAnyDefault(2).then((locations) => {
      [testData.firstLocation, testData.secondLocation] = locations;
    });

    // Precondition 1: Open order with one POL (Synchronized workflow, Quantity = 1, Loc 1,
    // Create inventory = Instance, Holdings, Item)
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
            quantity: QUANTITY,
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
              locationId: testData.firstLocation.id,
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

    // Precondition 2: User with required capabilities is logged in
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiReceivingViewEditCreate.gui,
      Permissions.uiInventoryMoveItems.gui,
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
    'C784510 Change receiving workflow from Synchronized to Independent in an Open order (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C784510'] },
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
      OrderLineEditForm.checkLocationIsNonEditable({ locationName: testData.firstLocation.name });
      OrderLineEditForm.checkLocationsSection([
        { label: 'quantityPhysical', index: 0, conditions: { disabled: true } },
      ]);
      OrderLineEditForm.checkReceivingRecordsMessage(true);

      // Step 2: Click on the tool tip "i" icon next to the "Receiving workflow" dropdown
      OrderLineEditForm.verifyReceivingWorkflowInfoPopover(
        ORDER_LINE_FORM_MESSAGES.RECEIVING_WORKFLOW_INFO,
      );

      // Step 3: Select "Receipt not required" option in the "Receipt status" dropdown
      OrderLineEditForm.fillOrderLineFields({
        receiptStatus: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED,
      });
      UpdateReceivingWorkflowModal.verifyModalView();

      // Step 4: Click "Cancel" button in the "Update receiving workflow" modal
      UpdateReceivingWorkflowModal.clickCancelButton();
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

      // Step 5: Select "Independent order and receipt quantity" option in the "Receiving workflow" dropdown
      OrderLineEditForm.fillPoLineDetails({
        receivingWorkflow: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
      });
      UpdateReceivingWorkflowModal.verifyModalView();

      // Step 6: Click "Confirm" button in the "Update receiving workflow" modal
      UpdateReceivingWorkflowModal.clickConfirmButton();
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'receiptStatus',
          conditions: { checkedOptionText: RECEIPT_STATUS_VIEW.AWAITING_RECEIPT },
        },
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
            disabled: true,
          },
        },
      ]);
      OrderLineEditForm.checkLocationsSection([
        {
          label: 'holding',
          index: 0,
          conditions: { singleValue: testData.firstLocation.name, disabled: false },
        },
        { label: 'quantityPhysical', index: 0, conditions: { disabled: false } },
      ]);
      OrderLineEditForm.checkReceivingRecordsMessage(false);

      // Step 7: Click "Save & close" button
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: true });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
            value: RECEIPT_STATUS_VIEW.AWAITING_RECEIPT,
          },
          {
            key: POLINE_DETAILS_FIELDS.RECEIVING_WORKFLOW,
            value: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
          },
        ],
      });

      // Step 8: Click "Actions" -> "Receive" and open the title related to the order
      OrderLines.receiveOrderLineViaActions();
      OrderLines.selectreceivedTitleName(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.checkReceivingDetails({
        orderLineDetails: [
          {
            key: POLINE_DETAILS_FIELDS.RECEIVING_WORKFLOW,
            value: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
          },
        ],
      });
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 9: Click "Actions" in the "Expected" accordion and select "Add piece" option
      Receivings.addPieceInActions();
      EditPieceModal.waitLoading();

      // Step 10: Check "Create item", create new holdings for "Loc 2" and click "Save & close"
      EditPieceModal.checkCreateItemCheckbox();
      EditPieceModal.clickCreateNewholdingsForLocation();
      SelectLocationModal.selectLocation(testData.secondLocation.name);
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(2);

      // Step 11: Click on the "POL number" link in the "POL details" accordion
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.firstLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
          ],
        ],
      });
      OrderLineDetails.verifyLocationAbsentInSection(testData.secondLocation.name);

      // Step 12: Click on the Title name in the "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(2);

      [testData.firstLocation, testData.secondLocation].forEach((location) => {
        InventoryInstance.checkHoldingTitle({ title: location.name, count: 1 });
      });

      // Step 13: Click "Actions" and select "Move items within an instance" option
      InventoryInstance.openMoveItemsWithinAnInstance();
      InventoryInstance.openHoldings(testData.firstLocation.name, testData.secondLocation.name);
      [testData.firstLocation, testData.secondLocation].forEach((location) => {
        InstanceRecordView.verifyMoveToButtonState(location.name);
        InventoryInstance.verifyItemCheckboxesInHolding(location.name);
      });

      // Step 14: Check the item from "Loc 1" holding and move it to "Loc 2" holding
      InventoryInstance.moveItemToAnotherHolding({
        fromHolding: testData.firstLocation.name,
        toHolding: testData.secondLocation.name,
        shouldOpen: false,
        itemMoved: true,
      });
      InventoryInstance.verifyHoldingsAccordionsCount(2);
      InstanceRecordView.verifyQuantityOfItemsRelatedtoHoldings(testData.secondLocation.name, 2);

      // Step 15: Click hyperlink with PO line in the "Acquisition" accordion
      InventoryInstance.openPolFromAcquisitionsAccordion();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.firstLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
          ],
        ],
      });
      OrderLineDetails.verifyLocationAbsentInSection(testData.secondLocation.name);

      // Step 16: Click "Actions" -> "Receive" and open the title related to the order
      OrderLines.receiveOrderLineViaActions();
      OrderLines.selectreceivedTitleName(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(2);

      // Step 17: Click "Actions" -> "Receive" in the "Expected" accordion, check both pieces and receive
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.receiveAll();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(2);

      // Step 18: Click on the "POL number" link in the "POL details" accordion
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
            value: RECEIPT_STATUS_VIEW.PARTIALLY_RECEIVED,
          },
        ],
      });
      OrderLineDetails.checkLocationsSection({
        locations: [
          [
            { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.firstLocation.name },
            { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: QUANTITY },
          ],
        ],
      });
      OrderLineDetails.verifyLocationAbsentInSection(testData.secondLocation.name);
    },
  );
});
