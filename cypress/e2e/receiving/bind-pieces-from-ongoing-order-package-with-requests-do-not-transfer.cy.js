import { v4 as uuid } from 'uuid';

import {
  APPLICATION_NAMES,
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  NO_VALUE,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_BOUND_ITEMS_COLUMN_LABELS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
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
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { BindPiecesForm, ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Requests from '../../support/fragments/requests/requests';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const BIND_PIECES_OPTION = 'Bind pieces';
const ITEM_DETAILS_ORIGINAL_ACCORDION = 'Item details (original)';
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
      displaySummary: `AT_C477550_Piece_${number}_${postfix}`,
      barcode: `AT_C477550_Piece_${number}_Barcode_${postfix}`,
      callNumber: `AT_C477550_Piece_${number}_CallNumber_${postfix}`,
      accessionNumber: `AT_C477550_Piece_${number}_AccessionNumber_${postfix}`,
    });

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      packageName: `AT_C477550_Package_${postfix}`,
      instanceTitle: `AT_C477550_FolioInstance_${postfix}`,
      piece1: getPiece(1),
      piece2: getPiece(2),
      piece3: getPiece(3),
      boundItemBarcode: `AT_C477550_BoundItem_Barcode_${postfix}`,
      requesters: [],
      requestIds: [],
    };

    cy.getAdminToken();
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
    InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
      ({ instanceData }) => {
        testData.instanceId = instanceData.instanceId;
      },
    );
    // Different requesters for requests on Piece #1 and Piece #2 items
    [0, 1].forEach(() => {
      cy.createTempUser([]).then((requester) => {
        testData.requesters.push(requester);
      });
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
          isPackage: true,
          titleOrPackage: testData.packageName,
          checkinItems: true,
          acquisitionMethod: testData.acquisitionMethod.id,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          locations: [{ locationId: testData.location.id, quantity: 1, quantityPhysical: 1 }],
          details: {
            ...BasicOrderLine.defaultOrderLine.details,
            isBinderyActive: true,
          },
          cost: {
            ...BasicOrderLine.defaultOrderLine.cost,
            quantityPhysical: 1,
          },
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
            materialSupplier: testData.organization.id,
            volumes: [],
          },
        }).then((orderLine) => {
          testData.orderLine = orderLine;

          OrderLines.addPackageTitleViaApi({
            title: testData.instanceTitle,
            poLineId: orderLine.id,
            instanceId: testData.instanceId,
          }).then(({ body: title }) => {
            testData.titleId = title.id;
          });
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    cy.then(() => {
      const { piece1, piece2, piece3, requesters } = testData;
      const pieceDefaults = {
        ...NewPiece.defaultPiece,
        poLineId: testData.orderLine.id,
        titleId: testData.titleId,
      };

      // All pieces with related items in the same "Loc 1" holding
      Pieces.upsertOrderPiecesBatchViaApi(
        [{ ...pieceDefaults, ...piece1, locationId: testData.location.id }],
        { createItem: true },
      ).then(({ pieces: [createdPiece1] }) => {
        testData.holdingId = createdPiece1.holdingId;

        Pieces.upsertOrderPiecesBatchViaApi(
          [piece2, piece3].map((piece) => ({
            ...pieceDefaults,
            ...piece,
            holdingId: createdPiece1.holdingId,
          })),
          { createItem: true },
        ).then(({ pieces }) => {
          // Outstanding requests only for Piece #1 and Piece #2 items
          [createdPiece1, pieces.find(({ id }) => id === piece2.id)].forEach(
            ({ itemId }, index) => {
              Requests.createNewRequestViaApi({
                fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
                holdingsRecordId: createdPiece1.holdingId,
                instanceId: testData.instanceId,
                itemId,
                pickupServicePointId: testData.pickupServicePoint.id,
                requestDate: new Date().toISOString(),
                requestLevel: REQUEST_LEVELS.ITEM,
                requestType: REQUEST_TYPES.HOLD,
                requesterId: requesters[index].userId,
              }).then(({ body }) => {
                testData.requestIds.push(body.id);
              });
            },
          );
          // Piece #2 and Piece #3 are received, Piece #1 remains "Expected"
          Receivings.receivePieceViaApi({
            poLineId: testData.orderLine.id,
            pieces: [{ id: piece2.id }, { id: piece3.id }],
          });
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
    testData.requestIds.forEach((requestId) => {
      Requests.deleteRequestViaApi(requestId);
    });
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    testData.requesters.forEach((requester) => {
      Users.deleteViaApi(requester.userId);
    });
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C477550 Bind pieces from ongoing order (package), when related items have outstanding requests (do not transfer) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C477550'] },
    () => {
      const { piece1, piece2, piece3 } = testData;
      const openBoundPiece = (displaySummary) => {
        ReceivingDetails.filterReceivedPiecesByOptions([
          RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
        ]);
        ReceivingDetails.openEditPieceModal({ section: 'received', displaySummary });
        EditPieceModal.waitLoading();
      };
      const checkBoundPiece = ({ barcode, callNumber, accessionNumber, request }) => {
        EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, true);
        OrderLines.checkConnectedInstance();
        EditPieceModal.checkAccordionsConditions([
          { label: ITEM_DETAILS_ORIGINAL_ACCORDION, conditions: { open: true } },
        ]);
        EditPieceModal.verifyItemStatus(ITEM_STATUS_NAMES.UNAVAILABLE);
        EditPieceModal.checkFieldsConditions([
          { label: RECEIVING_PIECE_FORM_FIELD_LABELS.BARCODE, conditions: { value: barcode } },
          {
            label: RECEIVING_PIECE_FORM_FIELD_LABELS.CALL_NUMBER,
            conditions: { value: callNumber },
          },
          {
            label: RECEIVING_PIECE_FORM_FIELD_LABELS.ACCESSION_NUMBER,
            conditions: { value: accessionNumber },
          },
          { label: RECEIVING_PIECE_FORM_FIELD_LABELS.REQUEST, conditions: { value: request } },
        ]);
      };

      // Step 1: Click on Title record related to POL
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(2);

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
      [piece2, piece3].forEach(({ displaySummary, barcode }) => {
        BindPiecesForm.checkPieceRowContent(displaySummary, [barcode]);
      });

      // Step 3: Select all pieces, fill fields (except "Call number"), select "Loc 1" holding
      BindPiecesForm.selectAllPieces();
      BindPiecesForm.fillBindItemDetails({
        barcode: testData.boundItemBarcode,
        materialType: testData.materialType.name,
        permanentLoanType: testData.loanType.name,
        permanentLocation: testData.location.name,
      });
      BindPiecesForm.checkButtonsConditions([{ label: 'Bind', conditions: { disabled: false } }]);

      // Step 4: Click "Bind" button
      BindPiecesForm.clickBindButton({ hasOpenRequests: true });
      // Only Piece #2 of the bound pieces has a request
      BindPiecesForm.checkTransferRequestsModal([piece2.barcode]);

      // Step 5: Click "Do not transfer" button
      BindPiecesForm.clickDoNotTransferRequestsButton({ barcode: testData.boundItemBarcode });
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedTableContent([{ displaySummary: piece1.displaySummary }]);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.assertBoundItemsListCount(1);
      ReceivingDetails.checkBoundItemsTableContent([
        { barcode: testData.boundItemBarcode, status: ITEM_STATUS_NAMES.IN_PROCESS },
      ]);
      ReceivingDetails.checkBoundItemsTableContent([{ callNumber: NO_VALUE }]);

      // Step 6: Click "Actions" button in "Received" accordion and check "Bound" checkbox
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.verifyReceivedRecordsCount(2);
      ReceivingDetails.checkReceivedPiecesPresent([piece2.barcode, piece3.barcode]);

      // Step 7: Click on "Piece #1" record ("Expected" accordion, as Piece #1 is not received)
      ReceivingDetails.openEditPieceModal({ displaySummary: piece1.displaySummary });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, false, {
        disabled: true,
      });
      OrderLines.checkConnectedInstance();
      EditPieceModal.verifyItemStatus(ITEM_STATUS_NAMES.ON_ORDER);
      EditPieceModal.checkFieldsConditions([
        { label: RECEIVING_PIECE_FORM_FIELD_LABELS.REQUEST, conditions: { value: 'Yes' } },
      ]);

      // Step 8: Close "Edit piece" form, check "Bound" filter and click on "Piece #2" record
      EditPieceModal.clickCancelButton();
      openBoundPiece(piece2.displaySummary);
      checkBoundPiece({ ...piece2, request: 'Yes' });

      // Step 9: Close "Edit piece" form, check "Bound" filter and click on "Piece #3" record
      EditPieceModal.clickCancelButton();
      openBoundPiece(piece3.displaySummary);
      checkBoundPiece({ ...piece3, request: NO_VALUE });

      // Step 10: Click "Connected" link under "Create item" label
      Receivings.selectConnectedInEditPiece();
      ItemRecordView.waitLoading();
      ItemRecordView.verifyItemBarcode(testData.boundItemBarcode);
      ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.IN_PROCESS);

      // Step 11: Go back to "Receiving" app and click on the record in "Bound items" accordion
      // "Receiving" app restores the last opened page, which is "Edit piece" form of Piece #3
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      EditPieceModal.waitLoading();
      EditPieceModal.clickCancelButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.clickBoundItemBarcodeLink(testData.boundItemBarcode);
      ItemRecordView.verifyItemBarcode(testData.boundItemBarcode);
      ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.IN_PROCESS);
      ItemRecordView.verifyMaterialType(testData.materialType.name);
      ItemRecordView.verifyPermanentLoanType(testData.loanType.name);
      ItemRecordView.verifyEffectiveLocation(testData.location.name);
      // Requests of Piece #1 and Piece #2 items are not transferred to the new item
      ItemRecordView.verifyRequestsCount(0);

      // Step 12: Click Instance link at the top
      ItemRecordView.clickInstanceTitleLink(testData.instanceTitle);
      InventoryInstance.waitInventoryLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 4 });
      // Items order in the holding is not stable, so items are checked by barcode
      InventoryInstance.checkHoldingsTableContent({ holdingId: testData.holdingId });
      InventoryInstance.checkItemStatusByBarcode(piece1.barcode, ITEM_STATUS_NAMES.ON_ORDER);

      [piece2, piece3].forEach(({ barcode }) => {
        InventoryInstance.checkItemStatusByBarcode(barcode, ITEM_STATUS_NAMES.UNAVAILABLE);
      });

      InventoryInstance.checkItemStatusByBarcode(
        testData.boundItemBarcode,
        ITEM_STATUS_NAMES.IN_PROCESS,
      );
    },
  );
});
