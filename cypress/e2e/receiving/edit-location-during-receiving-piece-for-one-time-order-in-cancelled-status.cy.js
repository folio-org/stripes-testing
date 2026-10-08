import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  DELETE_HOLDINGS_ACTIONS,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  ORDER_LINE_PAYMENT_STATUS,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import InteractorsTools from '../../support/utils/interactorsTools';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import DeleteHoldingsModalReceivingFullScreen from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import Permissions from '../../support/dictionary/permissions';
import { ReceivingsListEditForm } from '../../support/fragments/receiving';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    polLocation: {},
    newLocation: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    cancelledOrderLine: {},
    secondOrderLine: {},
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
        testData.polLocation = location;
      })
      .then(() => cy.getLocations({ limit: 1, query: `name=${LOCATION_NAMES.ANNEX_UI}` }))
      .then((location) => {
        testData.newLocation = location;
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

  const getOrderLine = () => {
    return BasicOrderLine.getDefaultOrderLine({
      purchaseOrderId: testData.order.id,
      acquisitionMethod: testData.acquisitionMethod.id,
      specialLocationId: testData.polLocation.id,
      specialMaterialTypeId: testData.materialType.id,
    });
  };

  const createOrderWithOrderLines = () => {
    return Orders.createOrderViaApi({
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    })
      .then((orderResponse) => {
        testData.order = orderResponse;

        return OrderLines.createOrderLineViaApi(getOrderLine());
      })
      .then((orderLineResponse) => {
        testData.cancelledOrderLine = orderLineResponse;

        return OrderLines.createOrderLineViaApi(getOrderLine());
      })
      .then((orderLineResponse) => {
        testData.secondOrderLine = orderLineResponse;
      });
  };

  const openOrder = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.OPEN,
    })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData.secondOrderLine.id))
      .then((orderLine) => {
        testData.secondOrderLine = orderLine;
      });
  };

  const cancelOrderLine = () => {
    return OrderLines.getOrderLineByIdViaApi(testData.cancelledOrderLine.id)
      .then((orderLine) => OrderLines.updateOrderLineViaApi({
        ...orderLine,
        paymentStatus: ORDER_LINE_PAYMENT_STATUS.CANCELLED,
        receiptStatus: RECEIPT_STATUS_VIEW.CANCELLED,
      }))
      .then(() => OrderLines.getOrderLineByIdViaApi(testData.cancelledOrderLine.id))
      .then((orderLine) => {
        testData.cancelledOrderLine = orderLine;
      });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      OrderLinesLimit.setPOLLimitViaApi(2);

      createOrganization()
        .then(fetchReferenceData)
        .then(createOrderWithOrderLines)
        .then(openOrder)
        .then(cancelOrderLine);
    });

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiReceivingViewEditCreate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receiving.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.getOrderByIdViaApi(testData.order.id).then((order) => {
      Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.PENDING }, true, false);
    });
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
      testData.cancelledOrderLine.instanceId,
    );
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
      testData.secondOrderLine.instanceId,
    );
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C543753 Edit location during receiving piece for one-time order in "Cancelled" status (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C543753'] },
    () => {
      // Step 1: Go to the title related to cancelled POL
      Receiving.searchByParameter({ value: testData.cancelledOrderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.cancelledOrderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.cancelledOrderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 2: Click actions button in "Expected" accordion, select "Receive" option
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.verifyFormView({
        polNumber: testData.cancelledOrderLine.poLineNumber,
        titleName: testData.cancelledOrderLine.titleOrPackage,
        orderLineLocations: testData.polLocation.name,
        rowCount: 1,
      });
      ReceivingsListEditForm.checkReceivingItemDetails({
        holdingLocation: testData.polLocation.name,
      });

      // Step 3: Check the record, create new holdings for different location, click "Receive"
      ReceivingsListEditForm.fillReceivingFields();
      ReceivingsListEditForm.clickCreateNewHoldingsButton();
      SelectLocationModal.selectLocation(testData.newLocation.name);
      ReceivingsListEditForm.clickReceiveButton({ receiveSaved: false });

      // Step 4: Click "Keep Holdings" button
      DeleteHoldingsModalReceivingFullScreen.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.KEEP_HOLDINGS,
        locations: [testData.polLocation],
      });
      InteractorsTools.checkCalloutMessage(ReceivingStates.receiveSavedSuccessfully);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.cancelledOrderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 5: Click "POL number" link in "POL details" accordion
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.CANCELLED },
        ],
        costDetails: [{ key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' }],
        locationDetails: {
          locations: [
            [{ key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.newLocation.name }],
          ],
        },
      });

      // Step 6: Click on the link under "Title" field in "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.waitLoading();
      InventoryInstance.checkHoldingsTableContent({
        name: testData.newLocation.name,
        records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });
      InstanceRecordView.verifyItemsListIsEmpty(testData.polLocation.name);

      // Step 7: Go back to the order details pane
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
    },
  );
});
