import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  COMMON_BUTTON_LABELS,
  HOLDING_RECEIVING_HISTORY,
  INVENTORY_ITEMS,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  NO_BARCODE,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  RECEIVING_PIECE_FORMATS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingsListEditForm from '../../support/fragments/receiving/receivingsListEditForm';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

const randomPostfix = getRandomPostfix();
const receivedPiece = {
  displaySummary: `AT_C451594_summary_${randomPostfix}`,
  enumeration: `AT_C451594_enumeration_${randomPostfix}`,
  chronology: `AT_C451594_chronology_${randomPostfix}`,
  copyNumber: `AT_C451594_copy_${randomPostfix}`,
  accessionNumber: `AT_C451594_accession_${randomPostfix}`,
  barcode: `AT_C451594_${randomPostfix}`,
  receiptDate: DateTools.getTomorrowDayDateForFiscalYear(),
  comment: `AT_C451594_comment_${randomPostfix}`,
  callNumber: `AT_C451594_call_number_${randomPostfix}`,
  displayOnHolding: true,
};

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    location: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    pieces: [],
    user: {},
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
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

  const createOrderWithClaimingOrderLine = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            title: `AT_C451594_Title_${randomPostfix}`,
            quantity: 4,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
          claimingActive: true,
          claimingInterval: 1,
        });
      })
      .then((orderLine) => {
        testData.orderLine = orderLine;
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

        return Receiving.getPiecesViaApi(orderLine.id);
      })
      .then((pieces) => {
        testData.pieces = [...pieces].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
      });
  };

  const changePieceStatus = (piece, receivingStatus) => {
    return Pieces.updateOrderPiecesStatusesBatchViaApi({
      pieceIds: [piece.id],
      receivingStatus,
      claimingInterval: 1,
    });
  };

  // Pieces are listed by sequence number, so sequence 1 stays "Expected"
  // and sequences 2-4 get "Claim delayed", "Claim sent" and "Late"
  const changePiecesStatuses = () => {
    const [, claimDelayedPiece, claimSentPiece, latePiece] = testData.pieces;

    return changePieceStatus(claimDelayedPiece, RECEIVING_PIECE_STATUSES.CLAIM_DELAYED)
      .then(() => changePieceStatus(claimSentPiece, RECEIVING_PIECE_STATUSES.CLAIM_SENT))
      .then(() => changePieceStatus(latePiece, RECEIVING_PIECE_STATUSES.LATE));
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiInventoryViewInstances.gui,
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
      .then(createOrderWithClaimingOrderLine)
      .then(openOrder)
      .then(changePiecesStatuses)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Receiving.unreceivePiecesViaApi({
        poLineId: testData.orderLine.id,
        pieceIds: testData.pieces.map(({ id }) => id),
      });
      Orders.updateOrderViaApi(
        { ...testData.order, workflowStatus: ORDER_STATUSES.PENDING },
        true,
        false,
      );
      Orders.deleteOrderViaApi(testData.order.id, false);
      InventoryInstance.deleteInstanceViaApi(testData.orderLine.instanceId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C451594 Check receiving full-screen page for pieces having varying statuses ("Expected", "Claim Delayed", "Claim Sent", "Late") (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C451594'] },
    () => {
      const title = testData.orderLine.titleOrPackage;
      const locationName = testData.location.name;

      // Step 1: Open the title
      Receiving.searchByParameter({ value: title });
      Receiving.selectFromResultsList(title);
      ReceivingDetails.verifyExpectedRecordsCount(4);
      ReceivingDetails.checkExpectedTableContent([
        { status: RECEIVING_PIECE_STATUSES.EXPECTED },
        { status: RECEIVING_PIECE_STATUSES.CLAIM_DELAYED },
        { status: RECEIVING_PIECE_STATUSES.CLAIM_SENT },
        { status: RECEIVING_PIECE_STATUSES.LATE },
      ]);

      // Step 2: Open receiving full-screen page
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.verifyFormView({
        polNumber: testData.orderLine.poLineNumber,
        titleName: title,
      });

      // Step 3: Select one piece
      ReceivingsListEditForm.fillReceivingFields({ rowIndex: 0 });
      ReceivingsListEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.RECEIVE, conditions: { disabled: false } },
      ]);

      // Step 4: Fill the piece fields
      ReceivingsListEditForm.fillReceivingFields({ rowIndex: 0, checked: false, ...receivedPiece });

      // Step 5: Receive the selected piece
      ReceivingsListEditForm.clickReceiveButton();
      ReceivingDetails.waitLoading();
      ReceivingDetails.verifyExpectedRecordsCount(3);
      ReceivingDetails.checkExpectedTableContent([
        { status: RECEIVING_PIECE_STATUSES.CLAIM_DELAYED },
        { status: RECEIVING_PIECE_STATUSES.CLAIM_SENT },
        { status: RECEIVING_PIECE_STATUSES.LATE },
      ]);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedTableContent([
        {
          barcode: receivedPiece.barcode,
          displaySummary: receivedPiece.displaySummary,
          copyNumber: receivedPiece.copyNumber,
          enumeration: receivedPiece.enumeration,
          chronology: receivedPiece.chronology,
          comment: receivedPiece.comment,
          format: RECEIVING_PIECE_FORMATS.PHYSICAL,
          receivedDate: new Date().toLocaleDateString('en-US'),
          holdingsLocation: testData.location.name,
          displayToPublic: false,
          request: '-',
        },
      ]);

      // Step 6: Check receipt status of the PO line
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
            value: RECEIPT_STATUS_VIEW.PARTIALLY_RECEIVED,
          },
        ],
      });

      // Steps 7-8: Open the instance and check items of the holding
      OrderLineDetails.openInventoryItem();
      InventoryInstance.waitLoading();
      InventoryInstance.openHoldingsAccordion(testData.location.name);
      InventoryInstance.checkItemStatusByBarcode(
        receivedPiece.barcode,
        ITEM_STATUS_NAMES.IN_PROCESS,
      );
      InventoryInstance.checkItemStatusByBarcode(NO_BARCODE, ITEM_STATUS_NAMES.ON_ORDER);

      // Step 9: Open the received item
      InventoryInstance.openItemByBarcode(receivedPiece.barcode);
      ItemRecordView.checkItemRecordDetails({
        administrativeData: [
          { label: INVENTORY_ITEMS.BARCODE, conditions: { value: receivedPiece.barcode } },
          {
            label: INVENTORY_ITEMS.ACCESSION_NUMBER,
            conditions: { value: receivedPiece.accessionNumber },
          },
        ],
        itemData: [
          { label: INVENTORY_ITEMS.COPY_NUMBER, conditions: { value: receivedPiece.copyNumber } },
          { label: INVENTORY_ITEMS.CALL_NUMBER, conditions: { value: receivedPiece.callNumber } },
        ],
        enumerationData: [
          {
            label: INVENTORY_ITEMS.DISPLAY_SUMMARY,
            conditions: { value: receivedPiece.displaySummary },
          },
          { label: INVENTORY_ITEMS.ENUMERATION, conditions: { value: receivedPiece.enumeration } },
          { label: INVENTORY_ITEMS.CHRONOLOGY, conditions: { value: receivedPiece.chronology } },
        ],
      });

      // Step 10: Receive all remaining pieces
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receiving.searchByParameter({ value: title });
      Receiving.selectFromResultsList(title);
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.receiveAll();
      ReceivingDetails.waitLoading();
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(4);

      // Step 11: Check receipt status of the PO line
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.FULLY_RECEIVED },
        ],
      });

      // Step 12: Check all items of the holding are "In process"
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkHoldingsTableContent({
        name: locationName,
        records: [0, 1, 2, 3].map(() => ({ status: ITEM_STATUS_NAMES.IN_PROCESS })),
      });

      // Step 13: Check "Receiving history" of the holding
      InventoryInstance.viewHoldings();
      HoldingsRecordView.waitLoading();
      HoldingsRecordView.checkReceivingHistoryCount(1);
      HoldingsRecordView.checkReceivingHistoryValues({
        displaySummary: receivedPiece.displaySummary,
        copyNumber: receivedPiece.copyNumber,
        enumeration: receivedPiece.enumeration,
        chronology: receivedPiece.chronology,
        comment: receivedPiece.comment,
        publicDisplay: false,
        source: HOLDING_RECEIVING_HISTORY.RECEIVING,
      });
    },
  );
});
