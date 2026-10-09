import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  COMMON_BUTTON_LABELS,
  DELETE_HOLDINGS_ACTIONS,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import DeleteHoldingsModalReceivingFullScreen from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import InteractorsTools from '../../support/utils/interactorsTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrderClosedModal from '../../support/fragments/receiving/modals/orderClosedModal';
import Receiving from '../../support/fragments/receiving/receiving';
import { ReceivingsListEditForm } from '../../support/fragments/receiving';
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
    openOrder: {},
    openOrderLine: {},
    cancelledOrder: {},
    cancelledOrderLine: {},
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

  const createOpenedOrder = (orderKey, orderLineKey) => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData[orderKey] = order;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.polLocation.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
        );
      })
      .then((orderLine) => {
        testData[orderLineKey] = orderLine;

        return Orders.updateOrderViaApi({
          ...testData[orderKey],
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData[orderLineKey].id))
      .then((orderLine) => {
        testData[orderLineKey] = orderLine;
      });
  };

  const createOpenOrder = () => {
    return createOpenedOrder('openOrder', 'openOrderLine');
  };

  const createCancelledOrder = () => {
    return createOpenedOrder('cancelledOrder', 'cancelledOrderLine')
      .then(() => Orders.getOrderByIdViaApi(testData.cancelledOrder.id))
      .then((order) => Orders.updateOrderViaApi({
        ...order,
        workflowStatus: ORDER_STATUSES.CLOSED,
        closeReason: { reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED },
      }));
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.receivingPath,
          waiter: Receiving.waitLoading,
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    createOrganization()
      .then(fetchReferenceData)
      .then(createOpenOrder)
      .then(createCancelledOrder)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    [testData.openOrder, testData.cancelledOrder].forEach(({ id }) => {
      [ORDER_STATUSES.OPEN, ORDER_STATUSES.PENDING].forEach((workflowStatus) => {
        Orders.getOrderByIdViaApi(id).then((order) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus }, true, false);
        });
      });
      Orders.deleteOrderViaApi(id);
    });
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
      testData.openOrderLine.instanceId,
    );
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
      testData.cancelledOrderLine.instanceId,
    );
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C543748 Edit location during receiving piece for ongoing order in "Open" and "Cancelled" statuses (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C543748'] },
    () => {
      // Step 1: Go to the title related to POL from order #1
      Receiving.searchByParameter({ value: testData.openOrderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.openOrderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.openOrderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 2: Click actions button in "Expected" accordion, select "Receive" option
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.verifyFormView({
        polNumber: testData.openOrderLine.poLineNumber,
        titleName: testData.openOrderLine.titleOrPackage,
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
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.openOrderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 5: Click "POL number" link in "POL details" accordion
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.ONGOING },
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
      InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.newLocation.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: testData.newLocation.name,
        records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });
      InstanceRecordView.verifyItemsListIsEmpty(testData.polLocation.name);

      // Step 7: Go back to "Receiving" app, search for the title related to POL from order #2
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receiving.searchByParameter({ value: testData.cancelledOrderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.cancelledOrderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.cancelledOrderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 8: Click actions button in "Expected" accordion, select "Receive" option
      ReceivingDetails.openReceiveListEditForm({ isOrderClosed: true });

      // Step 9: Click "Continue" button
      OrderClosedModal.handleOrderClosedModal({ action: COMMON_BUTTON_LABELS.CONTINUE });
      ReceivingsListEditForm.waitLoading();
      ReceivingsListEditForm.verifyFormView({
        polNumber: testData.cancelledOrderLine.poLineNumber,
        titleName: testData.cancelledOrderLine.titleOrPackage,
        orderLineLocations: testData.polLocation.name,
        rowCount: 1,
      });
      ReceivingsListEditForm.checkReceivingItemDetails({
        holdingLocation: testData.polLocation.name,
      });

      // Step 10: Check the record, create new holdings for different location, click "Receive"
      ReceivingsListEditForm.fillReceivingFields();
      ReceivingsListEditForm.clickCreateNewHoldingsButton();
      SelectLocationModal.selectLocation(testData.newLocation.name);
      ReceivingsListEditForm.clickReceiveButton({ receiveSaved: false });

      // Step 11: Click "Keep Holdings" button
      DeleteHoldingsModalReceivingFullScreen.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.KEEP_HOLDINGS,
        locations: [testData.polLocation],
      });
      InteractorsTools.checkCalloutMessage(ReceivingStates.receiveSavedSuccessfully);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.cancelledOrderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 12: Click "POL number" link in "POL details" accordion
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

      // Step 13: Click on the link under "Title" field in "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.newLocation.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: testData.newLocation.name,
        records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });
      InstanceRecordView.verifyItemsListIsEmpty(testData.polLocation.name);
    },
  );
});
