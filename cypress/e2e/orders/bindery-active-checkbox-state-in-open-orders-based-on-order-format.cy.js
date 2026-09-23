import { v4 as uuid } from 'uuid';

import {
  APPLICATION_NAMES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  POLINE_DETAILS_FIELDS,
  ORDER_FORMAT_VALUES,
  RECEIVING_PIECE_FORMATS,
  RECEIVING_PIECE_STATUSES,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  NewOrder,
  NewPiece,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import UpdateReceivingWorkflowModal from '../../support/fragments/orders/modals/updateReceivingWorkflowModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const BIND_PIECES_OPTION = 'Bind pieces';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    electronicOrder: {},
    otherOrder: {},
    peMixOrder: {},
    physicalOrder: {},
    user: {},
  };

  const getBaseOrderLine = (descriptor) => ({
    id: uuid(),
    acquisitionMethod: testData.acquisitionMethod.id,
    automaticExport: false,
    claims: [],
    contributors: [],
    details: {
      productIds: [],
      subscriptionInterval: 0,
      isBinderyActive: false,
    },
    fundDistribution: [],
    isPackage: false,
    paymentStatus: 'Pending',
    receiptStatus: 'Pending',
    source: 'User',
    titleOrPackage: `AT_C857027_${descriptor}_${getRandomPostfix()}`,
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

          Receivings.getTitleByPoLineIdViaApi(openedOrderLine.id).then((title) => {
            orderData.title = title;
          });
        });
      });
    });
  };

  const receiveAllPieces = (orderData) => {
    Pieces.getOrderPiecesViaApi({ query: `poLineId==${orderData.orderLine.id}` }).then(
      ({ pieces }) => {
        Pieces.updateOrderPiecesStatusesBatchViaApi({
          pieceIds: pieces.map((piece) => piece.id),
          receivingStatus: RECEIVING_PIECE_STATUSES.RECEIVED,
        });
      },
    );
  };

  // Adding pieces to a PO line with independent receiving workflow increases its location
  // quantities, so the cost quantities have to be aligned to keep the PO line editable
  const syncOrderLineQuantitiesWithLocations = (orderData) => {
    OrderLines.getOrderLineByIdViaApi(orderData.orderLine.id).then((orderLine) => {
      const sumBy = (field) => orderLine.locations.reduce((sum, { [field]: value = 0 }) => sum + value, 0);
      const updatedOrderLine = {
        ...orderLine,
        cost: {
          ...orderLine.cost,
          quantityPhysical: sumBy('quantityPhysical'),
          quantityElectronic: sumBy('quantityElectronic'),
        },
      };

      OrderLines.updateOrderLineViaApi(updatedOrderLine).then(() => {
        orderData.orderLine = updatedOrderLine;
      });
    });
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
    cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    cy.then(() => {
      // Precondition 1: Open order with "Electronic resource" order format
      createOpenOrderWithOrderLine(
        {
          ...getBaseOrderLine('ElectronicPOLine'),
          checkinItems: true,
          orderFormat: ORDER_FORMAT_VALUES.ELECTRONIC_RESOURCE,
          cost: {
            currency: 'USD',
            discountType: 'percentage',
            listUnitPriceElectronic: 10,
            quantityElectronic: 1,
          },
          locations: [{ locationId: testData.location.id, quantityElectronic: 1 }],
          eresource: {
            activated: false,
            trial: false,
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            accessProvider: testData.organization.id,
            materialType: testData.materialType.id,
          },
        },
        testData.electronicOrder,
      );

      // Precondition 2: Open order with "Other" order format
      createOpenOrderWithOrderLine(
        {
          ...getBaseOrderLine('OtherPOLine'),
          checkinItems: true,
          orderFormat: ORDER_FORMAT_VALUES.OTHER,
          cost: {
            currency: 'USD',
            discountType: 'percentage',
            listUnitPrice: 10,
            quantityPhysical: 1,
          },
          locations: [{ locationId: testData.location.id, quantityPhysical: 1 }],
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
            materialSupplier: testData.organization.id,
            volumes: [],
          },
        },
        testData.otherOrder,
      );

      // Precondition 3: Open order with "P/E mix" order format
      createOpenOrderWithOrderLine(
        {
          ...getBaseOrderLine('PEMixPOLine'),
          checkinItems: true,
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
              locationId: testData.location.id,
              quantityPhysical: 1,
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
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
            accessProvider: testData.organization.id,
          },
        },
        testData.peMixOrder,
      );

      // Precondition 5: Open order with "Physical" order format and synchronized receiving workflow
      createOpenOrderWithOrderLine(
        {
          ...getBaseOrderLine('PhysicalPOLine'),
          checkinItems: false,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          cost: {
            currency: 'USD',
            discountType: 'percentage',
            listUnitPrice: 10,
            quantityPhysical: 2,
          },
          locations: [
            {
              locationId: testData.location.id,
              quantity: 2,
              quantityPhysical: 2,
            },
          ],
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
            materialSupplier: testData.organization.id,
            volumes: [],
          },
        },
        testData.physicalOrder,
      );
    });

    cy.then(() => {
      // Precondition 4: Two received physical pieces with created items for the "P/E mix" order
      Pieces.upsertOrderPiecesBatchViaApi(
        Array.from({ length: 2 }, (_, index) => ({
          ...NewPiece.defaultPiece,
          id: uuid(),
          format: RECEIVING_PIECE_FORMATS.PHYSICAL,
          poLineId: testData.peMixOrder.orderLine.id,
          titleId: testData.peMixOrder.title.id,
          holdingId: testData.peMixOrder.orderLine.locations[0].holdingId,
          displaySummary: `AT_C857027_Piece_${index + 1}`,
        })),
        { createItem: true },
      ).then(() => {
        receiveAllPieces(testData.peMixOrder);
        syncOrderLineQuantitiesWithLocations(testData.peMixOrder);
      });

      // Precondition 6: All pieces of the "Physical" order are received
      receiveAllPieces(testData.physicalOrder);
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiReceivingViewEdit.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
      // Precondition 8: Search results for the Order #1 are displayed
      Orders.searchByParameter('PO number', testData.electronicOrder.order.poNumber);
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.electronicOrder.order.id);
    Orders.deleteOrderViaApi(testData.otherOrder.order.id);
    Orders.deleteOrderViaApi(testData.peMixOrder.order.id);
    Orders.deleteOrderViaApi(testData.physicalOrder.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C857027 Bindery active checkbox is displayed in the correct state in open orders based on the order format (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C857027'] },
    () => {
      // Step 1: Open the Order #1, its PO line and the PO line edit form
      Orders.selectFromResultsList(testData.electronicOrder.order.poNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();
      OrderLines.editPOLInOrder();
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'binderyActive', conditions: { checked: false, disabled: true } },
      ]);

      // Step 2: Navigate to the Order #2, open its PO line and the PO line edit form
      OrderLineEditForm.clickCancelButton();
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
      Orders.selectOrderByPONumber(testData.otherOrder.order.poNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();
      OrderLines.editPOLInOrder();
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'binderyActive', conditions: { checked: false, disabled: true } },
      ]);

      // Step 3: Navigate to the Order #3, open its PO line and the PO line edit form
      OrderLineEditForm.clickCancelButton();
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
      Orders.selectOrderByPONumber(testData.peMixOrder.order.poNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();
      OrderLines.editPOLInOrder();
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'binderyActive', conditions: { checked: false, disabled: false } },
      ]);

      // Step 4: Check the "Bindery active" checkbox and save the PO line
      OrderLineEditForm.clickBinderyActiveCheckbox();
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
      });

      // Step 5: Receive the PO line and open the title details
      OrderLines.receiveOrderLineViaActions();
      OrderLines.selectreceivedTitleName(testData.peMixOrder.title.title);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.peMixOrder.title.title);
      ReceivingDetails.verifyReceivedRecordsCount(2);

      // Step 6: Click "Actions" button in the "Received" accordion
      ReceivingDetails.checkReceivedAccordionActionsMenuOptions([BIND_PIECES_OPTION]);

      // Step 7: Navigate to the Order #4, open its PO line and the PO line edit form
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.waitLoading();
      Orders.searchByParameter('PO number', testData.physicalOrder.order.poNumber);
      Orders.selectFromResultsList(testData.physicalOrder.order.poNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();
      OrderLines.editPOLInOrder();
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkOrderLineDetailsSection([
        { label: 'binderyActive', conditions: { checked: false, disabled: false } },
      ]);

      // Step 8: Check the "Bindery active" checkbox
      OrderLineEditForm.clickBinderyActiveCheckbox();
      UpdateReceivingWorkflowModal.verifyModalView();

      // Step 9: Click "Confirm" button in the "Update receiving workflow" modal
      UpdateReceivingWorkflowModal.clickConfirmButton();
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
      OrderLines.checkCreatedInventoryInPhysicalRecourceDetails(
        POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
      );

      // Step 10: Click "Save & close" button
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
      });

      // Step 11: Receive the PO line and open the title details
      OrderLines.receiveOrderLineViaActions();
      OrderLines.selectreceivedTitleName(testData.physicalOrder.title.title);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.physicalOrder.title.title);
      ReceivingDetails.verifyReceivedRecordsCount(2);

      // Step 12: Click "Actions" button in the "Received" accordion
      ReceivingDetails.checkReceivedAccordionActionsMenuOptions([BIND_PIECES_OPTION]);
    },
  );
});
