import {
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import AcqVersionHistory from '../../support/fragments/acqVersionHistory';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import {
  ReceivingDetails,
  Receivings,
  ReceivingsListEditForm,
} from '../../support/fragments/receiving';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { formatDateTime } from '../../support/utils/acquisitions';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const entityType = 'order-line';
  const testData = {};

  before('Create test data', () => {
    testData.title = `AT_C927735_POLTitle_${getRandomPostfix()}`;
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C927735_Organization_${getRandomPostfix()}`,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((locale) => {
      testData.locale = locale;
    });
    // second location is used to receive the second piece into a new holding
    Locations.getViaApiAnyDefault(2).then(([orderLocation, receivingLocation]) => {
      testData.orderLocation = orderLocation;
      testData.receivingLocation = receivingLocation;
    });
    MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
      [testData.materialType] = mtypes;
    });
    Organizations.createOrganizationViaApi(testData.organization);

    // Precondition 1: open order with PO line, synchronized workflow, quantity 2, "Instance, Holding, Item"
    cy.then(() => {
      Orders.createOrderWithOrderLineViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        BasicOrderLine.getDefaultOrderLine({
          title: testData.title,
          quantity: 2,
          checkinItems: false,
          createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
          specialLocationId: testData.orderLocation.id,
          specialMaterialTypeId: testData.materialType.id,
        }),
      ).then((order) => {
        testData.order = order;
      });
    });
    cy.get('@orderLine').then((orderLine) => {
      testData.orderLine = orderLine;
    });
    cy.then(() => Orders.getOrderByIdViaApi(testData.order.id)).then((order) => {
      Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
    });

    // Precondition 2: one piece is received
    cy.then(() => Receivings.getPiecesViaApi(testData.orderLine.id)).then(([piece]) => {
      Receivings.receivePieceViaApi({
        poLineId: testData.orderLine.id,
        pieces: [{ id: piece.id }],
      });
    });

    cy.createTempUser([
      Permissions.uiOrdersEdit.gui,
      Permissions.uiReceivingViewEdit.gui,
      Permissions.uiInventoryViewInstances.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.title);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C927735 Version history for the PO line displays carts in the correct chronological order after receiving (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C927735'] },
    () => {
      cy.intercept('GET', `/audit-data/acquisition/order-line/${testData.orderLine.id}*`).as(
        'versionHistory',
      );

      // Step 1: Open PO line and click "Version history" icon - current version shows receiving changes
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.openPolDetails(testData.title);
      OrderLineDetails.openVersionHistory();
      cy.wait('@versionHistory').then(({ response }) => {
        const [lastEvent] = response.body.orderLineAuditEvents;

        testData.firstReceivingDate = formatDateTime(testData.locale, lastEvent.eventDate);
      });
      cy.then(() => {
        AcqVersionHistory.assertVersionHistoryCard(entityType, {
          index: 0,
          eventDate: testData.firstReceivingDate,
          isCurrent: true,
          changedFields: [POLINE_DETAILS_FIELDS.RECEIPT_STATUS],
        });
        OrderLineDetails.verifyMetadataContent({
          updated: testData.firstReceivingDate.replace(',', ''),
        });
      });
      OrderLineDetails.checkHighlightedFieldsInVersionHistoryView([
        RECEIPT_STATUS_VIEW.PARTIALLY_RECEIVED,
      ]);

      // Step 2: Click on the previous version card - "Awaiting receipt" receipt status is highlighted
      AcqVersionHistory.selectVersionHistoryCard(entityType, { index: 1 });
      AcqVersionHistory.checkVersionHistoryCardIsActive(entityType, { index: 1 });
      AcqVersionHistory.assertVersionHistoryCard(entityType, {
        index: 1,
        changedFields: [POLINE_DETAILS_FIELDS.RECEIPT_STATUS],
      });
      OrderLineDetails.checkHighlightedFieldsInVersionHistoryView([
        RECEIPT_STATUS_VIEW.AWAITING_RECEIPT,
      ]);
      // Step 3: Close "Version history" pane, "Actions" -> "Receive", click on the Title name
      AcqVersionHistory.closeVersionHistory(entityType);
      OrderLines.openReceiving();
      Receivings.selectFromResultsList(testData.title);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      // Step 4: "Actions" -> "Receive" in "Expected" accordion
      ReceivingDetails.openReceiveListEditForm();
      // Step 5: Check the piece, create new holdings for another location and click "Receive"
      ReceivingsListEditForm.fillReceivingFields({ rowIndex: 0 });
      ReceivingsListEditForm.clickCreateNewHoldingsButton({ rowIndex: 0 });
      SelectLocationModal.selectLocation(testData.receivingLocation.name);
      ReceivingsListEditForm.clickReceiveButton();
      ReceivingDetails.verifyReceivedRecordsCount(2);
      // Step 6: Click "POL number" link and click "Version history" icon - current version shows second receiving changes
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.openVersionHistory();
      cy.wait('@versionHistory').then(({ response }) => {
        const [lastEvent] = response.body.orderLineAuditEvents;

        testData.secondReceivingDate = formatDateTime(testData.locale, lastEvent.eventDate);
      });
      cy.then(() => {
        AcqVersionHistory.assertVersionHistoryCard(entityType, {
          index: 0,
          eventDate: testData.secondReceivingDate,
          isCurrent: true,
          changedFields: [
            POLINE_DETAILS_FIELDS.HOLDING_NAME,
            POLINE_DETAILS_FIELDS.QUANTITY,
            POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL,
            POLINE_DETAILS_FIELDS.RECEIPT_DATE,
            POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
          ],
        });
        OrderLineDetails.verifyMetadataContent({
          updated: testData.secondReceivingDate.replace(',', ''),
        });
      });
      OrderLineDetails.checkHighlightedFieldsInVersionHistoryView([
        DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY'),
        RECEIPT_STATUS_VIEW.FULLY_RECEIVED,
        testData.receivingLocation.name,
      ]);
      // quantity is 1 per holding after receiving into a new holding
      OrderLineDetails.checkHighlightedFieldsInVersionHistoryView(['1'], { exactMatch: true });
    },
  );
});
