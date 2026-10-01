import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  COMMON_BUTTON_LABELS,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  NO_BARCODE,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  RECEIVING_PIECE_FORM_ACTIONS_LABELS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import TopMenu from '../../support/fragments/topMenu';
import UnreceivableListEditForm from '../../support/fragments/receiving/unreceivableListEditForm';
import Users from '../../support/fragments/users/users';

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    location: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    piece1: {},
    piece2: {},
    user: {},
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
  };

  const fetchReferenceData = () => {
    return cy
      .getLocations({ limit: 1, query: `name=${LOCATION_NAMES.MAIN_LIBRARY_UI}` })
      .then((location) => {
        testData.location = location;
      })
      .then(() => cy.getBookMaterialType())
      .then((materialType) => {
        testData.materialType = materialType;
      })
      .then(() => cy.getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      }))
      .then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
  };

  const createOrderWithOrderLine = () => {
    return Orders.createOrderViaApi({
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    })
      .then((orderResponse) => {
        testData.order = orderResponse;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: orderResponse.id,
            quantity: 2,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
        );
      })
      .then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;
      });
  };

  const openOrder = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.OPEN,
    })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine.id))
      .then((orderLine) => {
        testData.orderLine = orderLine;
      });
  };

  const changePiecesStatuses = () => {
    return Receiving.getPiecesViaApi(testData.orderLine.id).then((pieces) => {
      if (pieces && pieces.length > 1) {
        [testData.piece1, testData.piece2] = pieces;

        return Promise.all([
          Pieces.updateOrderPieceViaApi({
            ...testData.piece1,
            receivingStatus: RECEIVING_PIECE_STATUSES.UNRECEIVABLE,
          }),
          Pieces.updateOrderPieceViaApi({
            ...testData.piece2,
            receivingStatus: RECEIVING_PIECE_STATUSES.UNRECEIVABLE,
          }),
        ]);
      }
      return null;
    });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createOrganization()
        .then(fetchReferenceData)
        .then(createOrderWithOrderLine)
        .then(openOrder)
        .then(changePiecesStatuses);
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiReceivingViewEditDelete.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receiving.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Orders.updateOrderViaApi(
        {
          ...testData.order,
          workflowStatus: ORDER_STATUSES.PENDING,
        },
        true,
        false,
      );
      Orders.deleteOrderByOrderNumberViaApi(testData.order.poNumber);
      InventoryInstance.deleteInstanceViaApi(testData.orderLine.instanceId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C423668 Change piece status from "Unreceivable" to "Expected" in full screen view (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C423668'] },
    () => {
      // Steps 1-3 Search for the Title
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.verifyUnreceivableRecordsCount(2);

      // Step 4: Verify options in Actions menu
      Receiving.clickActionsInUnreceivableSection();
      Receiving.checkActionsMenuOptionsInUnreceivableSection();

      // Step 5: Select Expect option
      Receiving.selectExpectPieceInActionsMenu();
      UnreceivableListEditForm.waitLoading();
      UnreceivableListEditForm.verifyFormView({
        polNumber: testData.orderLine.poLineNumber,
        titleName: testData.orderLine.titleOrPackage,
      });

      // Step 6: Select one piece
      UnreceivableListEditForm.clickUnreceivingItemCheckbox({ rowIndex: 1 });
      UnreceivableListEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: RECEIVING_PIECE_FORM_ACTIONS_LABELS.EXPECT, conditions: { disabled: false } },
      ]);

      // Step 7: Click Expect button
      UnreceivableListEditForm.clickExpectButton();
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.verifyUnreceivableRecordsCount(1);

      // Step 8: Check Receipt status in PO line
      ReceivingDetails.openOrderLineDetails(testData.orderLine.poLineNumber);
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
            value: RECEIPT_STATUS_VIEW.PARTIALLY_RECEIVED,
          },
        ],
      });

      // Step 9-10: Check Item statuses in Inventory
      OrderLineDetails.openInventoryItem();
      InventoryInstance.openHoldingsAccordion(testData.location.name);
      InventoryInstance.checkItemStatusByBarcode(NO_BARCODE, ITEM_STATUS_NAMES.ON_ORDER);
      InventoryInstance.checkItemStatusByBarcode(NO_BARCODE, ITEM_STATUS_NAMES.ON_ORDER);
    },
  );
});
