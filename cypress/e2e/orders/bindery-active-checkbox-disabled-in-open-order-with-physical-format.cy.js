import { v4 as uuid } from 'uuid';

import {
  APPLICATION_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  POLINE_DETAILS_FIELDS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { BindPiecesForm, ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const BIND_PIECES_OPTION = 'Bind pieces';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    instanceHoldingsOrder: {},
    instanceOrder: {},
    noneInventoryOrder: {},
    user: {},
  };

  const getPhysicalOrderLine = (descriptor, createInventory) => ({
    id: uuid(),
    acquisitionMethod: testData.acquisitionMethod.id,
    automaticExport: false,
    checkinItems: true,
    claims: [],
    contributors: [],
    cost: {
      currency: 'USD',
      discountType: 'percentage',
      listUnitPrice: 10,
      quantityPhysical: 1,
    },
    details: {
      productIds: [],
      subscriptionInterval: 0,
      isBinderyActive: false,
    },
    fundDistribution: [],
    isPackage: false,
    locations: [{ locationId: testData.location.id, quantityPhysical: 1 }],
    orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
    paymentStatus: 'Pending',
    physical: {
      createInventory,
      materialType: testData.materialType.id,
      materialSupplier: testData.organization.id,
      volumes: [],
    },
    receiptStatus: 'Pending',
    source: 'User',
    titleOrPackage: `AT_C857026_${descriptor}_${getRandomPostfix()}`,
    vendorDetail: {
      instructions: '',
      vendorAccount: '1234',
      referenceNumbers: [],
    },
  });

  const createOpenOrderWithOrderLine = (orderLineProperties, orderData) => {
    const order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
    const orderLine = { ...orderLineProperties, purchaseOrderId: order.id };

    Orders.createOrderViaApi(order).then((orderResponse) => {
      orderData.order = orderResponse;

      OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        Orders.updateOrderViaApi({ ...orderResponse, workflowStatus: ORDER_STATUSES.OPEN });

        OrderLines.getOrderLineByIdViaApi(orderLineResponse.id).then((openedOrderLine) => {
          orderData.orderLine = openedOrderLine;
        });
      });
    });
  };

  const addPieceWithQuickReceive = (displaySummary) => {
    Receivings.addPieceInActions();
    EditPieceModal.waitLoading();
    EditPieceModal.fillPieceDetails({
      [RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_SUMMARY]: displaySummary,
    });
    EditPieceModal.checkCreateItemCheckbox();
    Receivings.quickReceiveInEditPieceModal();
  };

  const openOrderLineEditForm = () => {
    OrderLines.selectPOLInOrder(0);
    OrderLineDetails.waitLoading();
    OrderLines.editPOLInOrder();
    OrderLineEditForm.waitLoading();
  };

  before(() => {
    cy.clearLocalStorage();
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault().then((locations) => {
      [testData.location] = locations;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialType = materialType;
    });
    cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
      [testData.loanType] = loanTypes;
    });
    cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    cy.then(() => {
      // Precondition 1: Open order with "Create inventory" set to "Instance, Holdings"
      createOpenOrderWithOrderLine(
        getPhysicalOrderLine(
          'InstanceHoldingsPOLine',
          POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
        ),
        testData.instanceHoldingsOrder,
      );

      // Precondition 2: Open order with "Create inventory" set to "Instance"
      createOpenOrderWithOrderLine(
        getPhysicalOrderLine('InstancePOLine', POL_CREATE_INVENTORY_SETTINGS.INSTANCE),
        testData.instanceOrder,
      );

      // Precondition 3: Open order with "Create inventory" set to "None"
      createOpenOrderWithOrderLine(
        getPhysicalOrderLine('NoneInventoryPOLine', POL_CREATE_INVENTORY_SETTINGS.NONE),
        testData.noneInventoryOrder,
      );
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
      Permissions.uiReceivingViewEdit.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
      // Precondition 5: Search results for the Order #1 are displayed
      Orders.searchByParameter('PO number', testData.instanceHoldingsOrder.order.poNumber);
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.instanceHoldingsOrder.order.id);
    Orders.deleteOrderViaApi(testData.instanceOrder.order.id);
    Orders.deleteOrderViaApi(testData.noneInventoryOrder.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C857026 Bindery active checkbox is disabled in an open order with physical format if "Create inventory" is not set to "Instance, holdings, item" (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C857026'] },
    () => {
      const titleName = testData.noneInventoryOrder.orderLine.titleOrPackage;

      // Step 1: Open the Order #1, its PO line and the PO line edit form
      Orders.selectFromResultsList(testData.instanceHoldingsOrder.order.poNumber);
      openOrderLineEditForm();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'binderyActive', conditions: { checked: false, disabled: true } },
      ]);

      // Step 2: Navigate to the Order #2, open its PO line and the PO line edit form
      OrderLineEditForm.clickCancelButton();
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
      Orders.searchByParameter('PO number', testData.instanceOrder.order.poNumber);
      Orders.selectFromResultsList(testData.instanceOrder.order.poNumber);
      openOrderLineEditForm();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'binderyActive', conditions: { checked: false, disabled: true } },
      ]);

      // Step 3: Navigate to the Order #3, open its PO line and the PO line edit form
      OrderLineEditForm.clickCancelButton();
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
      Orders.searchByParameter('PO number', testData.noneInventoryOrder.order.poNumber);
      Orders.selectFromResultsList(testData.noneInventoryOrder.order.poNumber);
      openOrderLineEditForm();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'binderyActive', conditions: { checked: false, disabled: true } },
      ]);

      // Step 4: Close the edit form, go back to the order and unopen it
      OrderLineEditForm.clickCancelButton();
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.unOpenOrder({
        orderNumber: testData.noneInventoryOrder.order.poNumber,
        checkinItems: true,
        hasRelations: false,
        submit: true,
      });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 5: Open the PO line edit form of the pending order
      openOrderLineEditForm();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'binderyActive', conditions: { checked: false, disabled: false } },
      ]);

      // Step 6: Check the "Bindery active" checkbox
      OrderLineEditForm.clickBinderyActiveCheckbox();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'binderyActive', conditions: { checked: true } },
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
            disabled: true,
          },
        },
      ]);
      OrderLineEditForm.checkPhysicalResourceDetailsSection([
        {
          label: 'createInventory',
          conditions: {
            checkedOptionText: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
            disabled: true,
          },
        },
      ]);

      // Step 7: Click "Save & close" button
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: true });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.BINDERY_ACTIVE,
            value: { checked: true, disabled: true },
            checkbox: true,
          },
        ],
        physicalResourceDetails: [
          {
            key: POLINE_DETAILS_FIELDS.CREATE_INVENTORY,
            value: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
          },
        ],
      });

      // Step 8: Go back to the order and open it
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();
      OrderDetails.openOrder({ orderNumber: testData.noneInventoryOrder.order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 9: Receive the PO line and open the title details
      OrderLines.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();
      OrderLines.receiveOrderLineViaActions();
      OrderLines.selectreceivedTitleName(titleName);
      ReceivingDetails.checkTitlePaneIsDisplayed(titleName);
      ReceivingDetails.verifyExpectedRecordsCount(0);

      // Step 10: Add a piece with created item and quick receive it
      addPieceWithQuickReceive('AT_C857026_Piece_1');
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 11: Add one more piece with created item and quick receive it
      addPieceWithQuickReceive('AT_C857026_Piece_2');
      ReceivingDetails.verifyReceivedRecordsCount(2);

      // Step 12: Select "Bind pieces" option in the "Received" accordion
      ReceivingDetails.clickReceivedAccordionActionsMenuOption(BIND_PIECES_OPTION);
      BindPiecesForm.waitLoading();
      BindPiecesForm.checkFormTitle(
        `${testData.noneInventoryOrder.orderLine.poLineNumber} - ${titleName}`,
      );
      BindPiecesForm.checkPiecesCount(2);

      // Step 13: Select both pieces, fill in the bind item details and bind the pieces
      BindPiecesForm.selectPieces(2);
      BindPiecesForm.fillBindItemDetails({
        materialType: testData.materialType.name,
        permanentLoanType: testData.loanType.name,
        permanentLocation: testData.location.name,
      });
      BindPiecesForm.clickBindButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(titleName);
      ReceivingDetails.assertBoundItemsListCount(1);

      // Step 14: Add one more piece with created item and quick receive it
      addPieceWithQuickReceive('AT_C857026_Piece_3');
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 15: Open the PO line details from the "POL details" accordion and its edit form
      ReceivingDetails.openOrderLineDetails();
      OrderLines.editPOLInOrder();
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'binderyActive', conditions: { checked: true, disabled: false } },
      ]);

      // Step 16: Uncheck the "Bindery active" checkbox and save the PO line
      OrderLineEditForm.clickBinderyActiveCheckbox();
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: true });
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.BINDERY_ACTIVE,
            value: { checked: false, disabled: true },
            checkbox: true,
          },
        ],
      });

      // Step 17: Receive the PO line and open the title details
      OrderLines.receiveOrderLineViaActions();
      OrderLines.selectreceivedTitleName(titleName);
      ReceivingDetails.checkTitlePaneIsDisplayed(titleName);
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 18: Click "Actions" button in the "Received" accordion
      ReceivingDetails.checkReceivedAccordionActionsMenuOptions([BIND_PIECES_OPTION], {
        shouldExist: false,
      });
    },
  );
});
