import { v4 as uuid } from 'uuid';

import {
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_BOUND_ITEMS_COLUMN_LABELS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstance, InventoryInstances } from '../../support/fragments/inventory';
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
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
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
    const getPiece = (number, receiptDate) => ({
      id: uuid(),
      displaySummary: `AT_C543761_Piece_${number}_${postfix}`,
      barcode: `AT_C543761_Piece_${number}_Barcode_${postfix}`,
      receiptDate,
    });

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C543761_FolioInstance_${postfix}`,
      piece1: getPiece(1, DateTools.getTwoPreviousDaysDateForFiscalYear()),
      // Expected receipt date is older than the one of Piece #1
      piece2: getPiece(2, DateTools.getThreePreviousDaysDateForFiscalYear()),
      // No expected receipt date
      piece3: getPiece(3),
      piece4: getPiece(4, DateTools.getTwoFutureDaysDateForFiscalYear()),
      boundItem1: {
        barcode: `AT_C543761_BoundItem_1_Barcode_${postfix}`,
        callNumber: `AT_C543761_BoundItem_1_CallNumber_${postfix}`,
      },
      boundItem2: {
        barcode: `AT_C543761_BoundItem_2_Barcode_${postfix}`,
        callNumber: `AT_C543761_BoundItem_2_CallNumber_${postfix}`,
      },
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
        const { piece1, piece2, piece3, piece4 } = testData;

        Pieces.upsertOrderPiecesBatchViaApi(
          [piece1, piece2, piece3, piece4].map((piece) => ({
            ...NewPiece.defaultPiece,
            ...piece,
            poLineId: testData.orderLine.id,
            titleId: title.id,
            holdingId: testData.orderLine.locations[0].holdingId,
          })),
          { createItem: true },
        );
        Pieces.updateOrderPiecesStatusesBatchViaApi({
          pieceIds: [piece1, piece2, piece3, piece4].map(({ id }) => id),
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
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C543761 Bind two items in the same holding (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C543761'] },
    () => {
      const { piece1, piece2, piece3, piece4, boundItem1, boundItem2 } = testData;
      const boundItemRecords = [boundItem1, boundItem2].map(({ barcode, callNumber }) => ({
        barcode,
        status: ITEM_STATUS_NAMES.IN_PROCESS,
        callNumber,
      }));

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
      // Pieces are sorted by "Expected receipt date", pieces without date are the last
      BindPiecesForm.checkPiecesOrder([
        piece2.displaySummary,
        piece1.displaySummary,
        piece4.displaySummary,
        piece3.displaySummary,
      ]);

      // Step 3: Check the first two records and fill fields, create new holding for another location
      BindPiecesForm.selectPiecesByDisplaySummary([piece2.displaySummary, piece1.displaySummary]);
      BindPiecesForm.fillBindItemDetails({
        barcode: boundItem1.barcode,
        materialType: testData.materialType.name,
        callNumber: boundItem1.callNumber,
        permanentLoanType: testData.loanType.name,
        newHoldingLocation: testData.location2.name,
      });
      BindPiecesForm.checkButtonsConditions([{ label: 'Bind', conditions: { disabled: false } }]);

      // Step 4: Click "Bind" button
      BindPiecesForm.clickBindButton({ barcode: boundItem1.barcode });
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(2);
      ReceivingDetails.checkReceivedTableContent([
        { barcode: piece4.barcode },
        { barcode: piece3.barcode },
      ]);
      ReceivingDetails.assertBoundItemsListCount(1);
      ReceivingDetails.assertBoundItemsListColumns();
      ReceivingDetails.checkBoundItemsTableContent([boundItemRecords[0]]);

      // Step 5: Click "Actions" button in "Received" accordion and select "Bind pieces" option
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
      BindPiecesForm.checkPiecesOrder([piece4.displaySummary, piece3.displaySummary]);

      // Step 6: Check all records and fill fields, select existing holding from step 3
      BindPiecesForm.selectPiecesByDisplaySummary([piece4.displaySummary, piece3.displaySummary]);
      BindPiecesForm.fillBindItemDetails({
        barcode: boundItem2.barcode,
        materialType: testData.materialType.name,
        callNumber: boundItem2.callNumber,
        permanentLoanType: testData.loanType.name,
        permanentLocation: testData.location2.name,
      });
      BindPiecesForm.checkButtonsConditions([{ label: 'Bind', conditions: { disabled: false } }]);

      // Step 7: Click "Bind" button
      BindPiecesForm.clickBindButton({ barcode: boundItem2.barcode });
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.assertBoundItemsListCount(2);
      ReceivingDetails.checkBoundItemsTableContent(boundItemRecords);

      // Step 8: Click on the title hyperlink above "Title information" accordion
      ReceivingDetails.openInstanceDetailsByTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(2);
      InventoryInstance.checkHoldingTitle({ title: testData.location1.name, count: PIECES_TOTAL });
      InventoryInstance.checkHoldingTitle({ title: testData.location2.name, count: 2 });
      InventoryInstance.checkHoldingsTableContent({ name: testData.location1.name });

      [piece1, piece2, piece3, piece4].forEach(({ barcode }) => {
        InventoryInstance.checkItemStatusByBarcode(barcode, ITEM_STATUS_NAMES.UNAVAILABLE);
      });

      InventoryInstance.checkHoldingsTableContent({ name: testData.location2.name });

      [boundItem1, boundItem2].forEach(({ barcode }) => {
        InventoryInstance.checkItemStatusByBarcode(barcode, ITEM_STATUS_NAMES.IN_PROCESS);
      });
    },
  );
});
