import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  CLAIMING_CALLOUT_MESSAGES,
  CLAIMING_FILTER_LABELS,
  CLAIMING_RESULTS_LIST_COLUMNS,
  ORDER_STATUSES,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import Claiming from '../../support/fragments/claiming/claiming';
import {
  BasicOrderLine,
  NewOrder,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import DelayClaimModal from '../../support/fragments/receiving/modals/delayClaimModal';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import SendClaimModal from '../../support/fragments/receiving/modals/sendClaimModal';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

const { CLAIM_DELAYED, CLAIM_SENT } = RECEIVING_PIECE_STATUSES;
const PRECONDITION_CLAIMING_INTERVAL = 2;
const NEW_CLAIMING_INTERVAL = 4;

describe('Receiving', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    organization: {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C1602555_Organization_${randomPostfix}`,
    },
    orderLineTitle: `AT_C1602555_Title_${randomPostfix}`,
    pieces: ['piece1', 'piece2', 'piece3'].map((key) => ({
      displaySummary: `AT_C1602555_${key}_${randomPostfix}`,
    })),
    comment: `AT_C1602555_Comment_${randomPostfix}`,
    newClaimingDate: DateTools.getFormattedDate(
      { date: DateTools.addDays(NEW_CLAIMING_INTERVAL) },
      'MM/DD/YYYY',
    ),
    location: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    user: {},
  };
  const [piece1, piece2, piece3] = testData.pieces;

  // Sends GET /orders/pieces/{pieceId}, verifies the response and yields "statusUpdatedDate"
  const verifyPieceViaApi = (piece, { receivingStatus, claimingInterval, comment } = {}) => {
    return Pieces.getOrderPieceByIdViaApi(piece.id).then(({ status, body }) => {
      expect(status).to.equal(200);
      expect(body.displaySummary).to.equal(piece.displaySummary);
      expect(body.statusUpdatedDate).to.be.a('string');
      if (receivingStatus) expect(body.receivingStatus).to.equal(receivingStatus);
      if (claimingInterval) expect(body.claimingInterval).to.equal(claimingInterval);
      if (comment) expect(body.comment).to.equal(comment);

      return cy.wrap(body.statusUpdatedDate);
    });
  };

  const expectDateIsLater = (actualDate, previousDate) => {
    expect(new Date(actualDate).getTime()).to.be.greaterThan(new Date(previousDate).getTime());
  };

  before('Create test data', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault().then((locations) => {
      [testData.location] = locations;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialType = materialType;
    });
    cy.getAcquisitionMethodsApi({
      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
    }).then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.orderLineTitle,
            quantity: testData.pieces.length,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
          claimingActive: true,
          claimingInterval: 1,
        }).then((orderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.orderLine = openedOrderLine;
          });

          Pieces.getOrderPiecesViaApi({ query: `poLineId==${orderLine.id}` }).then(
            ({ pieces: orderPieces }) => {
              orderPieces.forEach((orderPiece, index) => {
                testData.pieces[index].id = orderPiece.id;
                Pieces.updateOrderPieceViaApi({ ...orderPiece, ...testData.pieces[index] });
              });

              // piece1 and piece2 are "Claim delayed", piece3 is "Claim sent" (current day + 2)
              Pieces.updateOrderPiecesStatusesBatchViaApi({
                pieceIds: [piece1.id, piece2.id],
                receivingStatus: CLAIM_DELAYED,
                claimingInterval: PRECONDITION_CLAIMING_INTERVAL,
              });
              Pieces.updateOrderPiecesStatusesBatchViaApi({
                pieceIds: [piece3.id],
                receivingStatus: CLAIM_SENT,
                claimingInterval: PRECONDITION_CLAIMING_INTERVAL,
              });
            },
          );
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiClaimsClaimingView,
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiReceivingEdit,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.claimingPath,
        waiter: Claiming.waitLoading,
      });
      Claiming.searchByTitle(testData.orderLineTitle);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.updateOrderViaApi(
      { ...testData.order, workflowStatus: ORDER_STATUSES.PENDING },
      true,
      false,
    );
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1602555 statusUpdatedDate of a piece is updated when “Delay claim” or “Send claim” is applied again without status change (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1602555'] },
    () => {
      const initialStatusUpdatedDates = {};

      // Step 1: Send GET /orders/pieces/{pieceId} for all pieces, note "statusUpdatedDate"
      testData.pieces.forEach((piece) => {
        verifyPieceViaApi(piece).then((statusUpdatedDate) => {
          initialStatusUpdatedDates[piece.displaySummary] = statusUpdatedDate;
        });
      });

      // Step 2: Check "Claim delayed" in "Receiving status" filter
      Claiming.filterByCheckboxes(CLAIMING_FILTER_LABELS.RECEIVING_STATUS, [CLAIM_DELAYED]);
      Claiming.sortResultsBy(CLAIMING_RESULTS_LIST_COLUMNS.DISPLAY_SUMMARY);
      Claiming.assertClaimingResults(
        [piece1, piece2].map(({ displaySummary }) => [
          { column: CLAIMING_RESULTS_LIST_COLUMNS.STATUS, content: CLAIM_DELAYED },
          { column: CLAIMING_RESULTS_LIST_COLUMNS.DISPLAY_SUMMARY, content: displaySummary },
        ]),
      );

      // Step 3: Delay claim for piece1 to current day + 4
      Claiming.selectResultsRecords([0]);
      Claiming.clickActionsButton();
      Claiming.clickDelayClaimOption();
      Claiming.fillDelayToDate(testData.newClaimingDate);
      Claiming.clickSaveAndCloseInDelayClaimModal();
      InteractorsTools.checkCalloutMessage(CLAIMING_CALLOUT_MESSAGES.CLAIMS_DELAYED);
      Claiming.assertClaimingResults(
        [piece1, piece2].map(({ displaySummary }) => [
          { column: CLAIMING_RESULTS_LIST_COLUMNS.STATUS, content: CLAIM_DELAYED },
          { column: CLAIMING_RESULTS_LIST_COLUMNS.DISPLAY_SUMMARY, content: displaySummary },
        ]),
      );

      // Step 4: GET piece1, "statusUpdatedDate" is later than the noted value
      verifyPieceViaApi(piece1, {
        receivingStatus: CLAIM_DELAYED,
        claimingInterval: NEW_CLAIMING_INTERVAL,
      }).then((statusUpdatedDate) => {
        expectDateIsLater(statusUpdatedDate, initialStatusUpdatedDates[piece1.displaySummary]);
      });

      // Step 5: In "Receiving" app, delay claim for piece2 to current day + 4
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receivings.searchByParameter({ value: testData.orderLineTitle });
      Receivings.selectFromResultsList(testData.orderLineTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLineTitle);
      ReceivingDetails.openEditPieceModal({ displaySummary: piece2.displaySummary });
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDelayClaimButton();
      DelayClaimModal.fillDelayToDate(testData.newClaimingDate);
      DelayClaimModal.clickSaveAndCloseButton();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      InteractorsTools.closeCalloutMessage();
      ReceivingDetails.checkExpectedPieceStatus(piece2.displaySummary, CLAIM_DELAYED);

      // Step 6: GET piece2, "statusUpdatedDate" is later than the noted value (note it)
      verifyPieceViaApi(piece2, {
        receivingStatus: CLAIM_DELAYED,
        claimingInterval: NEW_CLAIMING_INTERVAL,
      }).then((statusUpdatedDate) => {
        expectDateIsLater(statusUpdatedDate, initialStatusUpdatedDates[piece2.displaySummary]);
        piece2.delayedStatusUpdatedDate = statusUpdatedDate;
      });

      // Step 7: Fill in "Comment" of piece2, click "Save & close"
      ReceivingDetails.openEditPieceModal({ displaySummary: piece2.displaySummary });
      EditPieceModal.waitLoading();
      EditPieceModal.fillPieceDetails({
        [RECEIVING_PIECE_FORM_FIELD_LABELS.COMMENT]: testData.comment,
      });
      EditPieceModal.clickSaveAndCloseButton();
      InteractorsTools.closeCalloutMessage();
      ReceivingDetails.checkExpectedPieceStatus(piece2.displaySummary, CLAIM_DELAYED);

      // Step 8: GET piece2, "statusUpdatedDate" is not changed
      verifyPieceViaApi(piece2, {
        receivingStatus: CLAIM_DELAYED,
        claimingInterval: NEW_CLAIMING_INTERVAL,
        comment: testData.comment,
      }).then((statusUpdatedDate) => {
        expect(statusUpdatedDate).to.equal(piece2.delayedStatusUpdatedDate);
      });

      // Step 9: Send claim for piece3 with current day + 4
      ReceivingDetails.openEditPieceModal({ displaySummary: piece3.displaySummary });
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSendClaimButton();
      SendClaimModal.fillClaimExpiryDate(testData.newClaimingDate);
      SendClaimModal.clickSaveAndCloseButton();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      ReceivingDetails.checkExpectedPieceStatus(piece3.displaySummary, CLAIM_SENT);

      // Step 10: GET piece3, "statusUpdatedDate" is later than the noted value
      verifyPieceViaApi(piece3, {
        receivingStatus: CLAIM_SENT,
        claimingInterval: NEW_CLAIMING_INTERVAL,
      }).then((statusUpdatedDate) => {
        expectDateIsLater(statusUpdatedDate, initialStatusUpdatedDates[piece3.displaySummary]);
      });
    },
  );
});
