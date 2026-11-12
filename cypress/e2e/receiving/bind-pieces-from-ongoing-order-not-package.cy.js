import { v4 as uuid } from 'uuid';

import {
  ITEM_STATUS_NAMES,
  NO_VALUE,
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
  InventoryItems,
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
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const BIND_PIECES_OPTION = 'Bind pieces';
const PIECES_TOTAL = 3;
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

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C476839_FolioInstance_${postfix}`,
      piece1: {
        id: uuid(),
        displaySummary: `AT_C476839_Piece_1_${postfix}`,
        barcode: `AT_C476839_Piece_1_Barcode_${postfix}`,
        accessionNumber: `AT_C476839_Piece_1_AccessionNumber_${postfix}`,
        callNumber: `AT_C476839_Piece_1_CallNumber_${postfix}`,
      },
      piece2: {
        id: uuid(),
        displaySummary: `AT_C476839_Piece_2_${postfix}`,
        barcode: `AT_C476839_Piece_2_Barcode_${postfix}`,
      },
      piece3: {
        id: uuid(),
        displaySummary: `AT_C476839_Piece_3_${postfix}`,
      },
      boundItemCallNumber: `AT_C476839_BoundItem_CallNumber_${postfix}`,
    };

    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault(2).then((locations) => {
      [testData.location1, testData.location2] = locations;
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
            { locationId: testData.location1.id, quantityPhysical: 2, quantityElectronic: 1 },
            { locationId: testData.location2.id, quantityPhysical: 1 },
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

    cy.then(() => {
      const [loc1Holding, loc2Holding] = testData.orderLine.locations;

      testData.loc1HoldingId = loc1Holding.holdingId;

      Receivings.getTitleByPoLineIdViaApi(testData.orderLine.id).then((title) => {
        const pieceDefaults = {
          ...NewPiece.defaultPiece,
          poLineId: testData.orderLine.id,
          titleId: title.id,
        };
        const { piece1, piece2, piece3 } = testData;

        // Piece #1 and Piece #2 with related items in existing "Loc 1" holding
        Pieces.upsertOrderPiecesBatchViaApi(
          [
            { ...pieceDefaults, ...piece1, holdingId: loc1Holding.holdingId },
            { ...pieceDefaults, ...piece2, holdingId: loc1Holding.holdingId },
          ],
          { createItem: true },
        );
        // Piece #3 without related item in "Loc 2"
        Pieces.upsertOrderPiecesBatchViaApi(
          [{ ...pieceDefaults, ...piece3, holdingId: loc2Holding.holdingId }],
          { createItem: false },
        );
        Receivings.receivePieceViaApi({
          poLineId: testData.orderLine.id,
          pieces: [piece1, piece2, piece3].map(({ id }) => ({ id })),
        });
      });
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
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C476839 Bind pieces from ongoing order (not package) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C476839'] },
    () => {
      const { piece1, piece2, piece3 } = testData;
      const openBindPiecesForm = () => {
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
        BindPiecesForm.checkPiecesCount(PIECES_TOTAL);
      };

      // Step 1: Click on Title record related to POL
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(PIECES_TOTAL);

      // Step 2: Click "Actions" button in "Received" accordion and select "Bind pieces" option
      openBindPiecesForm();
      BindPiecesForm.checkPieceRowContent(piece1.displaySummary, [
        piece1.accessionNumber,
        piece1.callNumber,
        ITEM_STATUS_NAMES.IN_PROCESS,
      ]);

      // Step 3: Select any piece and click "Cancel" button
      BindPiecesForm.selectPiecesByDisplaySummary([piece3.displaySummary]);
      BindPiecesForm.clickCancelButton({ hasUnsavedChanges: true });
      AreYouSureModal.verifyAreYouSureForm(true);

      // Step 4: Click "Close without saving" button
      AreYouSureModal.clickCloseWithoutSavingButton();
      AreYouSureModal.verifyAreYouSureForm(false);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(PIECES_TOTAL);

      // Step 5: Click "Actions" button in "Received" accordion and select "Bind pieces" option
      openBindPiecesForm();

      // Step 6: Select Piece #1 and Piece #2, fill all fields except "Barcode" and "Permanent loan type"
      BindPiecesForm.selectPiecesByDisplaySummary([piece1.displaySummary, piece2.displaySummary]);
      BindPiecesForm.fillBindItemDetails({
        materialType: testData.materialType.name,
        callNumber: testData.boundItemCallNumber,
        newHoldingLocation: testData.location1.name,
      });
      BindPiecesForm.checkButtonsConditions([{ label: 'Bind', conditions: { disabled: true } }]);

      // Step 7: Select any value in "Permanent loan type" field
      BindPiecesForm.fillBindItemDetails({ permanentLoanType: testData.loanType.name });
      BindPiecesForm.checkButtonsConditions([{ label: 'Bind', conditions: { disabled: false } }]);

      // Step 8: Click "Bind" button
      BindPiecesForm.clickBindButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedTableContent([{ displaySummary: piece3.displaySummary }]);
      ReceivingDetails.assertBoundItemsListCount(1);
      ReceivingDetails.checkBoundItemsTableContent([
        { status: ITEM_STATUS_NAMES.IN_PROCESS, callNumber: testData.boundItemCallNumber },
      ]);
      // New "Loc 1" holding of the bound item, to tell it apart from the existing "Loc 1" holding
      Pieces.getOrderPiecesViaApi({ query: `id==${piece1.id}` })
        .then(({ pieces: [boundPiece] }) => InventoryItems.getItemByIdViaApi(boundPiece.bindItemId))
        .then((boundItem) => {
          testData.boundItemHoldingId = boundItem.holdingsRecordId;
        });

      // Step 9: Click "Actions" button in "Received" accordion and check "Bound" checkbox
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      // Bound pieces are added to the list, "Piece #3" stays displayed
      ReceivingDetails.verifyReceivedRecordsCount(PIECES_TOTAL);
      // Pieces are sorted by "Sequence" in descending order
      ReceivingDetails.checkReceivedTableContent([
        { displaySummary: piece3.displaySummary },
        { displaySummary: piece2.displaySummary },
        { displaySummary: piece1.displaySummary },
      ]);

      // Step 10: Click on "Piece #1" record
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece1.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, true);
      EditPieceModal.verifyItemStatus(ITEM_STATUS_NAMES.UNAVAILABLE);

      // Step 11: Close "Edit piece" form and click on "Piece #2" record
      EditPieceModal.clickCancelButton();
      // "Bound" filter is reset after closing "Edit piece" form
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

      // Step 12: Close "Edit piece" form and click on "Piece #3" record
      EditPieceModal.clickCancelButton();
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: piece3.displaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, false);
      EditPieceModal.verifyItemStatus(NO_VALUE);

      // Step 13: Close "Edit piece" form and click on "Title name" link
      EditPieceModal.clickCancelButton();
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.verifyHoldingsAccordionsCount(3);
      InventoryInstance.checkHoldingTitle({ title: testData.location1.name, count: 2 });
      InventoryInstance.checkHoldingTitle({ title: testData.location1.name, count: 1 });
      InventoryInstance.checkHoldingTitle({ title: testData.location2.name });

      // Step 14: Expand "Loc 1" accordion
      cy.then(() => {
        // Items order in the holding is not stable, so items are checked by barcode
        InventoryInstance.checkHoldingsTableContent({ holdingId: testData.loc1HoldingId });
        InventoryInstance.checkItemStatusByBarcode(piece1.barcode, ITEM_STATUS_NAMES.UNAVAILABLE);
        InventoryInstance.checkItemStatusByBarcode(piece2.barcode, ITEM_STATUS_NAMES.UNAVAILABLE);
        InventoryInstance.checkHoldingsTableContent({
          holdingId: testData.boundItemHoldingId,
          records: [{ barcode: 'No barcode', status: ITEM_STATUS_NAMES.IN_PROCESS }],
        });

        // Step 15: Click "No barcode" link in "Item: barcode" column
        InventoryInstance.openHoldingItem({
          holdingId: testData.boundItemHoldingId,
          shouldOpen: false,
        });
      });
      ItemRecordView.verifyItemBarcode();
      ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.IN_PROCESS);
      ItemRecordView.verifyEffectiveCallNumber(testData.boundItemCallNumber);
      ItemRecordView.verifyMaterialType(testData.materialType.name);
      ItemRecordView.verifyPermanentLoanType(testData.loanType.name);
      ItemRecordView.verifyEffectiveLocation(testData.location1.name);

      // Step 16: Close "Item" page and expand "Loc 2" accordion
      ItemRecordView.closeDetailView();
      // Items count badge is displayed only while holding accordion is collapsed
      InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location2.name, 0);
      InventoryInstance.checkHoldingsTableContent({ name: testData.location2.name });
    },
  );
});
