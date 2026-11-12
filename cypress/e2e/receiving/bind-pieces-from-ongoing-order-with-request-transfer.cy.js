import { v4 as uuid } from 'uuid';

import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  NO_BARCODE,
  NO_VALUE,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_BOUND_ITEMS_COLUMN_LABELS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_STATUSES,
  RECEIVING_RECEIVED_PIECE_FILTER_LABELS,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import {
  InventoryInstance,
  InventoryInstances,
  ItemRecordView,
} from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  NewPiece,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import AreYouSureModal from '../../support/fragments/orders/modals/areYouSureModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { BindPiecesForm, ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Requests from '../../support/fragments/requests/requests';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const BIND_PIECES_OPTION = 'Bind pieces';
const PIECES_TOTAL = 4;
const BIND_PIECES_TABLE_COLUMNS = [
  RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_SUMMARY,
  RECEIVING_PIECE_FORM_FIELD_LABELS.ENUMERATION,
  RECEIVING_PIECE_FORM_FIELD_LABELS.CHRONOLOGY,
  RECEIVING_PIECE_FORM_FIELD_LABELS.COPY_NUMBER,
  RECEIVING_PIECE_FORM_FIELD_LABELS.ACCESSION_NUMBER,
  RECEIVING_PIECE_FORM_FIELD_LABELS.BARCODE,
  RECEIVING_BOUND_ITEMS_COLUMN_LABELS.STATUS,
  RECEIVING_PIECE_FORM_FIELD_LABELS.CALL_NUMBER,
];

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    const getPiece = (number) => ({
      id: uuid(),
      displaySummary: `AT_C476882_Piece_${number}_${postfix}`,
      barcode: `AT_C476882_Piece_${number}_Barcode_${postfix}`,
    });

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C476882_FolioInstance_${postfix}`,
      piece1: getPiece(1),
      piece2: getPiece(2),
      piece3: getPiece(3),
      piece4: getPiece(4),
      boundItemCallNumber: `AT_C476882_BoundItem_CallNumber_${postfix}`,
    };

    cy.getAdminToken();
    cy.getAdminUserDetails().then((admin) => {
      testData.admin = admin;
    });
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault().then(([location]) => {
      testData.location = location;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialType = materialType;
    });
    cy.getLoanTypes({ limit: 1 }).then(([loanType]) => {
      testData.loanType = loanType;
    });
    cy.getAcquisitionMethodsApi({ limit: 1 }).then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });
    ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation==true' }).then(([servicePoint]) => {
      testData.pickupServicePoint = servicePoint;
    });

    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
          purchaseOrderId: order.id,
          titleOrPackage: testData.instanceTitle,
          checkinItems: true,
          acquisitionMethod: testData.acquisitionMethod.id,
          orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
          locations: [
            {
              locationId: testData.location.id,
              quantityPhysical: PIECES_TOTAL,
              quantityElectronic: 1,
            },
          ],
          details: {
            ...BasicOrderLine.defaultOrderLine.details,
            isBinderyActive: true,
          },
          cost: {
            ...BasicOrderLine.defaultOrderLine.cost,
            listUnitPriceElectronic: 10,
            quantityPhysical: PIECES_TOTAL,
            quantityElectronic: 1,
          },
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
        }).then((orderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.orderLine = openedOrderLine;
          });
        });
      });
    });

    // Four physical pieces with related items in "Loc 1"
    cy.then(() => {
      const { orderLine, piece1, piece2, piece3, piece4 } = testData;

      Receivings.getTitleByPoLineIdViaApi(orderLine.id).then((title) => {
        Pieces.upsertOrderPiecesBatchViaApi(
          [piece1, piece2, piece3, piece4].map((piece) => ({
            ...NewPiece.defaultPiece,
            ...piece,
            poLineId: orderLine.id,
            titleId: title.id,
            holdingId: orderLine.locations[0].holdingId,
          })),
          { createItem: true },
        ).then(({ pieces }) => {
          // Outstanding "Hold" request for item related to Piece #1
          Requests.createNewRequestViaApi({
            fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
            holdingsRecordId: orderLine.locations[0].holdingId,
            instanceId: orderLine.instanceId,
            itemId: pieces.find(({ id }) => id === piece1.id).itemId,
            pickupServicePointId: testData.pickupServicePoint.id,
            requestDate: new Date().toISOString(),
            requestLevel: REQUEST_LEVELS.ITEM,
            requestType: REQUEST_TYPES.HOLD,
            requesterId: testData.admin.id,
          }).then(({ body }) => {
            testData.requestId = body.id;
          });
        });
        Pieces.updateOrderPiecesStatusesBatchViaApi({
          pieceIds: [piece1.id, piece2.id],
          receivingStatus: RECEIVING_PIECE_STATUSES.RECEIVED,
        });
        Pieces.updateOrderPiecesStatusesBatchViaApi({
          pieceIds: [piece4.id],
          receivingStatus: RECEIVING_PIECE_STATUSES.UNRECEIVABLE,
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiInventoryInstanceView,
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiReceivingCreate,
          CapabilitySets.uiRequestsView,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receivings.waitLoading,
      });
      Receivings.searchByParameter({ value: testData.instanceTitle });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(testData.requestId);
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C476882 Bind pieces from ongoing order (not package), when related item has outstanding request (transfer) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C476882'] },
    () => {
      const { piece1, piece2, piece3, piece4 } = testData;
      const bindItemDetails = {
        materialType: testData.materialType.name,
        callNumber: testData.boundItemCallNumber,
        permanentLoanType: testData.loanType.name,
        permanentLocation: testData.location.name,
      };

      // Step 1: Click on Title record related to POL
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyReceivedRecordsCount(2);
      ReceivingDetails.verifyUnreceivableRecordsCount(1);

      // Step 2: Click "Actions" button in "Received" accordion and select "Bind pieces" option
      ReceivingDetails.clickReceivedAccordionActionsMenuOption(BIND_PIECES_OPTION);
      BindPiecesForm.waitLoading();
      BindPiecesForm.checkFormTitle(
        `${testData.orderLine.poLineNumber} - ${testData.instanceTitle}`,
      );
      BindPiecesForm.checkBindItemFieldsEmpty();
      BindPiecesForm.checkPiecesTableColumns(BIND_PIECES_TABLE_COLUMNS);
      BindPiecesForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Bind', conditions: { disabled: true } },
      ]);
      BindPiecesForm.checkPiecesCount(2);
      BindPiecesForm.checkPieceRowContent(piece1.displaySummary, [piece1.barcode]);
      BindPiecesForm.checkPieceRowContent(piece2.displaySummary, [piece2.barcode]);

      // Step 3: Select all pieces and fill fields, select existing "Loc 1" holding
      BindPiecesForm.selectAllPieces();
      BindPiecesForm.fillBindItemDetails(bindItemDetails);
      BindPiecesForm.checkButtonsConditions([{ label: 'Bind', conditions: { disabled: false } }]);

      // Step 4: Click "Cancel" button and click "Close without saving" button
      BindPiecesForm.clickCancelButton({ hasUnsavedChanges: true });
      AreYouSureModal.clickCloseWithoutSavingButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyReceivedRecordsCount(2);
      ReceivingDetails.verifyUnreceivableRecordsCount(1);

      // Step 5: Bind pieces one more time
      ReceivingDetails.clickReceivedAccordionActionsMenuOption(BIND_PIECES_OPTION);
      BindPiecesForm.waitLoading();
      BindPiecesForm.selectAllPieces();
      BindPiecesForm.fillBindItemDetails(bindItemDetails);
      BindPiecesForm.clickBindButton({ hasOpenRequests: true });
      BindPiecesForm.checkTransferRequestsModal([piece1.barcode]);

      // Step 6: Click "Transfer" button
      BindPiecesForm.clickTransferRequestsButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.assertBoundItemsListCount(1);
      ReceivingDetails.checkBoundItemsTableContent([
        {
          barcode: NO_BARCODE,
          status: ITEM_STATUS_NAMES.IN_PROCESS,
          callNumber: testData.boundItemCallNumber,
        },
      ]);

      // Step 7: Click "Actions" button in "Received" accordion and check "Bound" checkbox
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.verifyReceivedRecordsCount(2);

      // Step 8: Click on "Piece #1" record
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece1.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, true);
      EditPieceModal.verifyItemStatus(ITEM_STATUS_NAMES.UNAVAILABLE);
      EditPieceModal.checkFieldsConditions([
        { label: RECEIVING_PIECE_FORM_FIELD_LABELS.REQUEST, conditions: { value: NO_VALUE } },
      ]);

      // Step 9: Close "Edit piece" form, filter by "Bound" and click on "Piece #2" record
      EditPieceModal.clickCancelButton();
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece2.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, true);
      EditPieceModal.verifyItemStatus(ITEM_STATUS_NAMES.UNAVAILABLE);
      EditPieceModal.checkFieldsConditions([
        { label: RECEIVING_PIECE_FORM_FIELD_LABELS.REQUEST, conditions: { value: NO_VALUE } },
      ]);

      // Step 10: Close "Edit piece" form and check "Bound items" accordion
      EditPieceModal.clickCancelButton();
      ReceivingDetails.checkBoundItemsTableContent([
        { barcode: NO_BARCODE, callNumber: testData.boundItemCallNumber },
      ]);

      // Step 11: Click on "No barcode" link in "Bound items" accordion
      ReceivingDetails.clickBoundItemBarcodeLink(NO_BARCODE);
      ItemRecordView.verifyItemBarcode();
      ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.IN_PROCESS);
      ItemRecordView.verifyEffectiveCallNumber(testData.boundItemCallNumber);
      ItemRecordView.verifyMaterialType(testData.materialType.name);
      ItemRecordView.verifyPermanentLoanType(testData.loanType.name);
      ItemRecordView.verifyEffectiveLocation(testData.location.name);
      ItemRecordView.verifyRequestsCount(1);

      // Step 12: Click "Instance name" link below item name
      ItemRecordView.clickInstanceTitleLink(testData.instanceTitle);
      InventoryInstance.waitInventoryLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 5 });
      // Items order in the holding is not stable, so items are checked by barcode
      InventoryInstance.checkHoldingsTableContent({ name: testData.location.name });
      [piece1, piece2].forEach(({ barcode }) => {
        InventoryInstance.checkItemStatusByBarcode(barcode, ITEM_STATUS_NAMES.UNAVAILABLE);
      });
      [piece3, piece4].forEach(({ barcode }) => {
        InventoryInstance.checkItemStatusByBarcode(barcode, ITEM_STATUS_NAMES.ON_ORDER);
      });
      InventoryInstance.checkItemStatusByBarcode(NO_BARCODE, ITEM_STATUS_NAMES.IN_PROCESS);
    },
  );
});
