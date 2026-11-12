import { v4 as uuid } from 'uuid';

import {
  APPLICATION_NAMES,
  BOUND_PIECES_DATA_LIST_COLUMNS,
  ITEM_STATUS_NAMES,
  NO_VALUE,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_BOUND_ITEMS_COLUMN_LABELS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_STATUSES,
  RECEIVING_RECEIVED_PIECE_FILTER_LABELS,
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
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const BIND_PIECES_OPTION = 'Bind pieces';
const PIECES_TOTAL = 2;
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
      instanceTitle: `AT_C476838_FolioInstance_${postfix}`,
      piece1DisplaySummary: `AT_C476838_Piece_1_${postfix}`,
      piece2DisplaySummary: `AT_C476838_Piece_2_${postfix}`,
      piece2Barcode: `AT_C476838_Piece_2_Barcode_${postfix}`,
      boundItemBarcode: `AT_C476838_BoundItem_Barcode_${postfix}`,
      boundItemCallNumber: `AT_C476838_BoundItem_CallNumber_${postfix}`,
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
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
          purchaseOrderId: order.id,
          titleOrPackage: testData.instanceTitle,
          checkinItems: true,
          acquisitionMethod: testData.acquisitionMethod.id,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          locations: [
            {
              locationId: testData.location1.id,
              quantity: PIECES_TOTAL,
              quantityPhysical: PIECES_TOTAL,
            },
          ],
          details: {
            ...BasicOrderLine.defaultOrderLine.details,
            isBinderyActive: true,
          },
          cost: {
            ...BasicOrderLine.defaultOrderLine.cost,
            quantityPhysical: PIECES_TOTAL,
          },
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
            materialSupplier: testData.organization.id,
            volumes: [],
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
      Receivings.getTitleByPoLineIdViaApi(testData.orderLine.id).then((title) => {
        const pieceDefaults = {
          ...NewPiece.defaultPiece,
          poLineId: testData.orderLine.id,
          titleId: title.id,
          holdingId: testData.orderLine.locations[0].holdingId,
        };

        // Piece #1 without related item
        Pieces.upsertOrderPiecesBatchViaApi(
          [{ ...pieceDefaults, id: uuid(), displaySummary: testData.piece1DisplaySummary }],
          { createItem: false },
        );
        // Piece #2 with related item
        Pieces.upsertOrderPiecesBatchViaApi(
          [
            {
              ...pieceDefaults,
              id: uuid(),
              displaySummary: testData.piece2DisplaySummary,
              barcode: testData.piece2Barcode,
            },
          ],
          { createItem: true },
        );
      });
    });

    cy.then(() => {
      Receivings.getPiecesViaApi(testData.orderLine.id).then((pieces) => {
        Pieces.updateOrderPiecesStatusesBatchViaApi({
          pieceIds: pieces.map(({ id }) => id),
          receivingStatus: RECEIVING_PIECE_STATUSES.RECEIVED,
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
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C476838 Bind pieces from one-time physical order (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C476838'] },
    () => {
      const boundPiecesTable = {
        columns: Object.values(BOUND_PIECES_DATA_LIST_COLUMNS),
        rows: [testData.piece1DisplaySummary, testData.piece2DisplaySummary],
      };
      const verifyBoundItemRecord = () => {
        ItemRecordView.verifyItemBarcode(testData.boundItemBarcode);
        ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.IN_PROCESS);
        ItemRecordView.verifyEffectiveCallNumber(testData.boundItemCallNumber);
        ItemRecordView.verifyMaterialType(testData.materialType.name);
        ItemRecordView.verifyPermanentLoanType(testData.loanType.name);
        ItemRecordView.verifyEffectiveLocation(testData.location2.name);
      };

      // Step 1: Click on Title record related to POL
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(PIECES_TOTAL);

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
      BindPiecesForm.checkPiecesCount(PIECES_TOTAL);

      // Step 3: Select all pieces and fill fields, leaving "Material type" empty
      BindPiecesForm.selectPieces(PIECES_TOTAL);
      BindPiecesForm.fillBindItemDetails({
        barcode: testData.boundItemBarcode,
        callNumber: testData.boundItemCallNumber,
        permanentLoanType: testData.loanType.name,
        newHoldingLocation: testData.location2.name,
      });
      BindPiecesForm.checkButtonsConditions([{ label: 'Bind', conditions: { disabled: true } }]);

      // Step 4: Select "Material type" and click "Bind" button
      BindPiecesForm.fillBindItemDetails({ materialType: testData.materialType.name });
      BindPiecesForm.clickBindButton({ barcode: testData.boundItemBarcode });
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.assertBoundItemsListCount(1);
      ReceivingDetails.assertBoundItemsListColumns();
      ReceivingDetails.checkBoundItemsTableContent([
        {
          barcode: testData.boundItemBarcode,
          status: ITEM_STATUS_NAMES.IN_PROCESS,
          callNumber: testData.boundItemCallNumber,
        },
      ]);

      // Step 5: Click on the barcode hyperlink in "Bound items" accordion
      ReceivingDetails.clickBoundItemBarcodeLink(testData.boundItemBarcode);
      verifyBoundItemRecord();

      // Step 6: Check "Bound pieces data" accordion
      ItemRecordView.checkBoundPiecesDataTable(boundPiecesTable);

      // Step 7-8: Click "X" button for any piece and click "Cancel" button
      ItemRecordView.removePieceFromBoundItem(testData.piece1DisplaySummary, { confirm: false });
      ItemRecordView.checkBoundPiecesDataTable(boundPiecesTable);

      // Step 9: Go back to "Receiving" app and filter "Received" accordion by "Bound"
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receivings.waitLoading();
      Receivings.searchByParameter({ value: testData.instanceTitle });
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.verifyReceivedRecordsCount(PIECES_TOTAL);

      // Step 10: Click on "Piece #1" record
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: testData.piece1DisplaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, true);
      EditPieceModal.verifyItemStatus(NO_VALUE);

      // Step 11: Close "Edit piece" form and click on "Piece #2" record
      EditPieceModal.clickCancelButton();
      // "Bound" filter is reset after closing "Edit piece" form
      ReceivingDetails.filterReceivedPiecesByOptions([
        RECEIVING_RECEIVED_PIECE_FILTER_LABELS.BOUND,
      ]);
      ReceivingDetails.openEditPieceModal({
        section: 'received',
        displaySummary: testData.piece2DisplaySummary,
      });
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.BOUND, true);
      EditPieceModal.verifyItemStatus(ITEM_STATUS_NAMES.UNAVAILABLE);

      // Step 12: Close "Edit piece" form and click on "Title name" link
      EditPieceModal.clickCancelButton();
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.checkHoldingTitle({ title: testData.location1.name, count: 1 });
      InventoryInstance.checkHoldingTitle({ title: testData.location2.name, count: 1 });

      // Step 13: Expand "Loc 1" accordion
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location1.name,
        records: [{ barcode: testData.piece2Barcode, status: ITEM_STATUS_NAMES.UNAVAILABLE }],
      });

      // Step 14: Expand "Loc 2" accordion
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location2.name,
        records: [{ barcode: testData.boundItemBarcode, status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });

      // Step 15: Click the link in "Item: barcode" column
      InventoryInstance.openHoldingItem({
        name: testData.location2.name,
        barcode: testData.boundItemBarcode,
        shouldOpen: false,
      });
      verifyBoundItemRecord();

      // Step 16: Check "Bound pieces data" accordion
      ItemRecordView.checkBoundPiecesDataTable(boundPiecesTable);
      ItemRecordView.clickBarcodeLinkInBoundPiecesDataAccordion(testData.piece2Barcode);
      ItemRecordView.waitLoading();
      ItemRecordView.verifyItemBarcode(testData.piece2Barcode);
    },
  );
});
