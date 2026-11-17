import { v4 as uuid } from 'uuid';

import {
  APPLICATION_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import {
  InventoryInstances,
  InventoryItems,
  ItemRecordView,
} from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { PieceForm, ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import SendClaimModal from '../../support/fragments/receiving/modals/sendClaimModal';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

const { BARCODE, DISPLAY_SUMMARY, INTERNAL_NOTE } = RECEIVING_PIECE_FORM_FIELD_LABELS;

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C784497_Organization_${postfix}`,
      },
      instanceTitle: `AT_C784497_FolioInstance_${postfix}`,
      piece1: {
        displaySummary: `AT_C784497_Piece_1_${postfix}`,
        editedDisplaySummary: `AT_C784497_Piece_1_Edited_${postfix}`,
      },
      piece2: {
        displaySummary: `AT_C784497_Piece_2_${postfix}`,
        internalNote: `AT_C784497_Piece_2_InternalNote_${postfix}`,
        barcode: `AT_C784497_Piece_2_Barcode_${postfix}`,
      },
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
          // Receiving workflow: Synchronized order and receipt quantity
          checkinItems: false,
          acquisitionMethod: testData.acquisitionMethod.id,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          locations: [{ locationId: testData.location.id, quantity: 2, quantityPhysical: 2 }],
          cost: {
            ...BasicOrderLine.defaultOrderLine.cost,
            quantityPhysical: 2,
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

    // Pieces get display summaries to tell them apart; related items are suppressed from discovery
    cy.then(() => {
      Pieces.getOrderPiecesViaApi({ query: `poLineId==${testData.orderLine.id}` }).then(
        ({ pieces }) => {
          [testData.piece1, testData.piece2].forEach((pieceData, index) => {
            const piece = pieces[index];

            Pieces.updateOrderPieceViaApi({ ...piece, displaySummary: pieceData.displaySummary });
            InventoryItems.getItemByIdViaApi(piece.itemId).then((item) => {
              InventoryItems.editItemViaApi({ ...item, discoverySuppress: true });
            });
          });
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
          CapabilitySets.uiReceivingEdit,
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
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C784497 Item remains suppressed from discovery after editing its related receiving piece (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C784497'] },
    () => {
      const { instanceTitle, piece1, piece2 } = testData;

      // Step 1: Click on Title record
      Receivings.selectFromResultsList(instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.checkExpectedPieceStatus(
        piece1.displaySummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );
      ReceivingDetails.checkExpectedPieceStatus(
        piece2.displaySummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );

      // Step 2: Edit "Display summary" of piece #1
      ReceivingDetails.openEditPieceModal({ displaySummary: piece1.displaySummary });
      EditPieceModal.waitLoading();
      EditPieceModal.fillPieceDetails({ [DISPLAY_SUMMARY]: piece1.editedDisplaySummary });
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);
      ReceivingDetails.checkExpectedPieceStatus(
        piece1.editedDisplaySummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );

      // Step 3: Open the item of piece #1, it is suppressed from discovery
      ReceivingDetails.openEditPieceModal({ displaySummary: piece1.editedDisplaySummary });
      EditPieceModal.waitLoading();
      PieceForm.clickConnectedItemLink();
      ItemRecordView.waitLoading();
      ItemRecordView.suppressedAsDiscoveryIsPresent();

      // Step 4: Go back to "Receiving" and quick receive piece #1
      // "Receiving" reopens the "Edit piece" form of piece #1 from Step 3
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      Receivings.quickReceivePieceAdd();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceReceivedSuccessfully);
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 5: Open the item of received piece #1, it is suppressed from discovery
      ReceivingDetails.openEditPieceModal({
        section: 'Received',
        displaySummary: piece1.editedDisplaySummary,
      });
      EditPieceModal.waitLoading();
      PieceForm.clickConnectedItemLink();
      ItemRecordView.waitLoading();
      ItemRecordView.suppressedAsDiscoveryIsPresent();

      // Step 6: Go back to "Receiving" and unreceive piece #1
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickUnreceiveButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.checkExpectedPieceStatus(
        piece1.editedDisplaySummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );

      // Step 7: Open the item of piece #1, it is suppressed from discovery
      ReceivingDetails.openEditPieceModal({ displaySummary: piece1.editedDisplaySummary });
      EditPieceModal.waitLoading();
      PieceForm.clickConnectedItemLink();
      ItemRecordView.waitLoading();
      ItemRecordView.suppressedAsDiscoveryIsPresent();

      // Step 8: Go back to "Receiving", fill in "Internal note" of piece #2
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      EditPieceModal.clickCancelButton();
      ReceivingDetails.openEditPieceModal({ displaySummary: piece2.displaySummary });
      EditPieceModal.waitLoading();
      EditPieceModal.fillPieceDetails({ [INTERNAL_NOTE]: piece2.internalNote });
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);

      // Step 9: Open the item of piece #2, it is suppressed from discovery
      ReceivingDetails.openEditPieceModal({ displaySummary: piece2.displaySummary });
      EditPieceModal.waitLoading();
      PieceForm.clickConnectedItemLink();
      ItemRecordView.waitLoading();
      ItemRecordView.suppressedAsDiscoveryIsPresent();

      // Step 10: Go back to "Receiving", fill in "Barcode" and check "Display on holding" for piece #2
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      EditPieceModal.waitLoading();
      EditPieceModal.fillPieceDetails({ [BARCODE]: piece2.barcode });
      EditPieceModal.checkDisplayOnHoldingCheckbox();
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);

      // Step 11: Open the item of piece #2, it has the barcode and is suppressed from discovery
      ReceivingDetails.openEditPieceModal({ displaySummary: piece2.displaySummary });
      EditPieceModal.waitLoading();
      PieceForm.clickConnectedItemLink();
      ItemRecordView.waitLoading();
      ItemRecordView.verifyItemBarcode(piece2.barcode);
      ItemRecordView.suppressedAsDiscoveryIsPresent();

      // Step 12: Go back to "Receiving" and mark piece #2 as late
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickMarkLateButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);
      ReceivingDetails.checkExpectedPieceStatus(
        piece2.displaySummary,
        RECEIVING_PIECE_STATUSES.LATE,
      );

      // Step 13: Open the item of piece #2, it is suppressed from discovery
      ReceivingDetails.openEditPieceModal({ displaySummary: piece2.displaySummary });
      EditPieceModal.waitLoading();
      PieceForm.clickConnectedItemLink();
      ItemRecordView.waitLoading();
      ItemRecordView.suppressedAsDiscoveryIsPresent();

      // Step 14: Go back to "Receiving" and send claim for piece #2
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSendClaimButton();
      SendClaimModal.fillClaimExpiryDate(DateTools.getTomorrowDayDateForFiscalYear());
      SendClaimModal.clickSaveAndCloseButton();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);
      ReceivingDetails.checkExpectedPieceStatus(
        piece2.displaySummary,
        RECEIVING_PIECE_STATUSES.CLAIM_SENT,
      );

      // Step 15: Open the item of piece #2, it is suppressed from discovery
      ReceivingDetails.openEditPieceModal({ displaySummary: piece2.displaySummary });
      EditPieceModal.waitLoading();
      PieceForm.clickConnectedItemLink();
      ItemRecordView.waitLoading();
      ItemRecordView.suppressedAsDiscoveryIsPresent();

      // Step 16: Go back to "Receiving" and mark piece #2 as unreceivable
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickUnreceivableButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyUnreceivableRecordsCount(1);

      // Step 17: Open the item of unreceivable piece #2, it is suppressed from discovery
      ReceivingDetails.openEditPieceModal({
        section: 'Unreceivable',
        displaySummary: piece2.displaySummary,
      });
      EditPieceModal.waitLoading();
      PieceForm.clickConnectedItemLink();
      ItemRecordView.waitLoading();
      ItemRecordView.suppressedAsDiscoveryIsPresent();
    },
  );
});
