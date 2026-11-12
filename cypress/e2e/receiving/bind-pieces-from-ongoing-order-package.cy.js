import { v4 as uuid } from 'uuid';

import {
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_BOUND_ITEMS_COLUMN_LABELS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_RECEIVED_PIECE_FILTER_LABELS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import {
  InventoryInstance,
  InventoryInstances,
  ItemRecordView,
} from '../../support/fragments/inventory';
import InventoryInstancesMovement from '../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
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
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const BIND_PIECES_OPTION = 'Bind pieces';
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
    const getPiece = (index) => ({
      id: uuid(),
      displaySummary: `AT_C476869_Piece_${index}_${postfix}`,
      barcode: `AT_C476869_Piece_${index}_Barcode_${postfix}`,
    });

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      packageName: `AT_C476869_Package_${postfix}`,
      instanceTitle: `AT_C476869_FolioInstance_${postfix}`,
      piece1: getPiece(1),
      piece2: getPiece(2),
      piece3: getPiece(3),
      piece4: getPiece(4),
      boundItemCallNumber: `AT_C476869_BoundItem_CallNumber_${postfix}`,
    };

    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault(3).then((locations) => {
      [testData.location1, testData.location2, testData.location3] = locations;
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
    InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
      ({ instanceData }) => {
        testData.instanceId = instanceData.instanceId;
      },
    );

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
          locations: [{ locationId: testData.location1.id, quantity: 1, quantityPhysical: 1 }],
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
      const { piece1, piece2, piece3, piece4 } = testData;
      const pieceDefaults = {
        ...NewPiece.defaultPiece,
        poLineId: testData.orderLine.id,
        titleId: testData.titleId,
      };

      // Piece #1 and Piece #2 with related items in the same "Loc 1" holding
      Pieces.upsertOrderPiecesBatchViaApi(
        [{ ...pieceDefaults, ...piece1, locationId: testData.location1.id }],
        { createItem: true },
      ).then(({ pieces: [createdPiece1] }) => {
        Pieces.upsertOrderPiecesBatchViaApi(
          [{ ...pieceDefaults, ...piece2, holdingId: createdPiece1.holdingId }],
          { createItem: true },
        );
      });
      // Piece #3 and Piece #4 with related items in the same "Loc 2" holding
      Pieces.upsertOrderPiecesBatchViaApi(
        [{ ...pieceDefaults, ...piece3, locationId: testData.location2.id }],
        { createItem: true },
      ).then(({ pieces: [createdPiece3] }) => {
        Pieces.upsertOrderPiecesBatchViaApi(
          [{ ...pieceDefaults, ...piece4, holdingId: createdPiece3.holdingId }],
          { createItem: true },
        );
      });

      // Pieces #1-3 are received, Piece #4 remains "Expected"
      cy.then(() => {
        Receivings.receivePieceViaApi({
          poLineId: testData.orderLine.id,
          pieces: [piece1, piece2, piece3].map(({ id }) => ({ id })),
        });
      });
      // "Bound" checkbox is checked only for Piece #2
      Pieces.getOrderPiecesViaApi({ query: `id==${piece2.id}` }).then(
        ({ pieces: [receivedPiece2] }) => {
          Pieces.updateOrderPieceViaApi({ ...receivedPiece2, isBound: true });
        },
      );
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiReceivingCreate,
          CapabilitySets.uiInventoryInstanceView,
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
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C476869 Bind pieces from ongoing order (package) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C476869'] },
    () => {
      const { piece1, piece2, piece3, piece4 } = testData;

      // Step 1: Click on Title record related to POL
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);
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
      BindPiecesForm.checkPieceRowContent(piece1.displaySummary, [piece1.barcode]);
      BindPiecesForm.checkPieceRowContent(piece3.displaySummary, [piece3.barcode]);

      // Step 3: Select Piece #1 and Piece #3, fill all fields except "Barcode" and "Permanent location"
      BindPiecesForm.selectPiecesByDisplaySummary([piece1.displaySummary, piece3.displaySummary]);
      BindPiecesForm.fillBindItemDetails({
        materialType: testData.materialType.name,
        callNumber: testData.boundItemCallNumber,
        permanentLoanType: testData.loanType.name,
      });
      BindPiecesForm.checkButtonsConditions([{ label: 'Bind', conditions: { disabled: true } }]);

      // Step 4: Select location different from POL location and click "Bind" button
      BindPiecesForm.fillBindItemDetails({ newHoldingLocation: testData.location3.name });
      BindPiecesForm.clickBindButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedTableContent([{ displaySummary: piece4.displaySummary }]);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.assertBoundItemsListCount(1);
      ReceivingDetails.checkBoundItemsTableContent([
        { status: ITEM_STATUS_NAMES.IN_PROCESS, callNumber: testData.boundItemCallNumber },
      ]);

      // Step 5: Click "Actions" button in "Received" accordion and check "Bound" checkbox
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.verifyReceivedRecordsCount(3);
      // Pieces are sorted by "Sequence" in descending order
      ReceivingDetails.checkReceivedTableContent([
        { displaySummary: piece3.displaySummary },
        { displaySummary: piece2.displaySummary },
        { displaySummary: piece1.displaySummary },
      ]);

      // Step 6: Click on "Piece #1" record
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece1.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, true);
      EditPieceModal.verifyItemStatus(ITEM_STATUS_NAMES.UNAVAILABLE);

      // Step 7: Close "Edit piece" form, check "Bound" filter and click on "Piece #3" record
      EditPieceModal.clickCancelButton();
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece3.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, true);
      EditPieceModal.verifyItemStatus(ITEM_STATUS_NAMES.UNAVAILABLE);

      // Step 8: Close "Edit piece" form and click on "Piece #4" record
      EditPieceModal.clickCancelButton();
      ReceivingDetails.openEditPieceModal({ displaySummary: piece4.displaySummary });
      EditPieceModal.waitLoading();
      // "Bound" checkbox is disabled for "Expected" piece
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, false, {
        disabled: true,
      });
      EditPieceModal.verifyItemStatus(ITEM_STATUS_NAMES.ON_ORDER);

      // Step 9: Close "Edit piece" form and click on "Title name" link
      EditPieceModal.clickCancelButton();
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(3);
      InventoryInstance.checkHoldingTitle({ title: testData.location1.name, count: 2 });
      InventoryInstance.checkHoldingTitle({ title: testData.location2.name, count: 2 });
      InventoryInstance.checkHoldingTitle({ title: testData.location3.name, count: 1 });

      // Step 10: Expand "Loc 1" accordion
      InventoryInstance.checkHoldingsTableContent({ name: testData.location1.name });
      InventoryInstancesMovement.verifyItemBarcodeInHoldings(
        piece1.barcode,
        testData.location1.name,
      );
      InventoryInstancesMovement.verifyItemBarcodeInHoldings(
        piece2.barcode,
        testData.location1.name,
      );
      InventoryInstance.checkItemStatusByBarcode(piece1.barcode, ITEM_STATUS_NAMES.UNAVAILABLE);
      InventoryInstance.checkItemStatusByBarcode(piece2.barcode, ITEM_STATUS_NAMES.IN_PROCESS);

      // Step 11: Expand "Loc 2" accordion
      InventoryInstance.checkHoldingsTableContent({ name: testData.location2.name });
      InventoryInstancesMovement.verifyItemBarcodeInHoldings(
        piece3.barcode,
        testData.location2.name,
      );
      InventoryInstancesMovement.verifyItemBarcodeInHoldings(
        piece4.barcode,
        testData.location2.name,
      );
      InventoryInstance.checkItemStatusByBarcode(piece3.barcode, ITEM_STATUS_NAMES.UNAVAILABLE);
      InventoryInstance.checkItemStatusByBarcode(piece4.barcode, ITEM_STATUS_NAMES.ON_ORDER);

      // Step 12: Expand "Loc 3" accordion
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location3.name,
        records: [{ barcode: 'No barcode', status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });

      // Step 13: Click "No barcode" link in "Item: barcode" column
      InventoryInstance.openHoldingItem({ name: testData.location3.name, shouldOpen: false });
      ItemRecordView.verifyItemBarcode();
      ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.IN_PROCESS);
      ItemRecordView.verifyEffectiveCallNumber(testData.boundItemCallNumber);
      ItemRecordView.verifyMaterialType(testData.materialType.name);
      ItemRecordView.verifyPermanentLoanType(testData.loanType.name);
      ItemRecordView.verifyEffectiveLocation(testData.location3.name);
    },
  );
});
