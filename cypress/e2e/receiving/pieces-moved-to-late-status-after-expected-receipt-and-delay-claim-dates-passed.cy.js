import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  const randomPostfix = getRandomPostfix();
  const futureReceiptDate = DateTools.addDays(7);
  const testData = {
    organization: {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C436736_Organization_${randomPostfix}`,
    },
    orderLineTitle: `AT_C436736_Title_${randomPostfix}`,
    pieceSummaries: {
      first: `AT_C436736_Pcs1_${randomPostfix}`,
      second: `AT_C436736_Pcs2_${randomPostfix}`,
      third: `AT_C436736_Pcs3_${randomPostfix}`,
    },
    futureReceiptDateForApi: `${DateTools.getFormattedDate({ date: futureReceiptDate })}T12:00:00.000+00:00`,
    futureReceiptDate: DateTools.getFormattedDate({ date: futureReceiptDate }, 'MM/DD/YYYY'),
    pastReceiptDate: DateTools.getFormattedDate({ date: DateTools.addDays(-2) }, 'MM/DD/YYYY'),
    // At least "claimingInterval" + 1 days before the current date
    pastStatusUpdatedDate: DateTools.addDays(-3).toISOString(),
    location: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    user: {},
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
        NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.orderLineTitle,
            quantity: 3,
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

          Receiving.getPiecesViaApi(orderLine.id).then((pieces) => {
            const [firstPiece, secondPiece, thirdPiece] = [...pieces].sort(
              (a, b) => a.sequenceNumber - b.sequenceNumber,
            );

            // "Pcs 1" and "Pcs 3" remain "Expected" with "Expected receipt date" in the future
            Pieces.updateOrderPieceViaApi({
              ...firstPiece,
              displaySummary: testData.pieceSummaries.first,
              receiptDate: testData.futureReceiptDateForApi,
            });
            Pieces.updateOrderPieceViaApi({
              ...thirdPiece,
              displaySummary: testData.pieceSummaries.third,
              receiptDate: testData.futureReceiptDateForApi,
            });

            // "Pcs 2" is "Claim delayed" until tomorrow, then its "statusUpdatedDate" is moved
            // to the past without changing "claimingInterval"
            Pieces.updateOrderPiecesStatusesBatchViaApi({
              pieceIds: [secondPiece.id],
              receivingStatus: RECEIVING_PIECE_STATUSES.CLAIM_DELAYED,
              claimingInterval: 1,
            });
            Pieces.getOrderPiecesViaApi({ query: `id==${secondPiece.id}` }).then(
              ({ pieces: [claimDelayedPiece] }) => {
                Pieces.updateOrderPieceViaApi({
                  ...claimDelayedPiece,
                  displaySummary: testData.pieceSummaries.second,
                  statusUpdatedDate: testData.pastStatusUpdatedDate,
                });
              },
            );
          });
        });
      });
    });
    Pieces.processClaimingViaApi();

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiReceivingEdit,
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiInventoryInstanceView,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receiving.waitLoading,
      });
      Receiving.searchByParameter({ value: testData.orderLineTitle });
      Receiving.selectFromResultsList(testData.orderLineTitle);
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
    'C436736 Pieces are moved to "Late" status after "Expected receipt date" and "Delay claim" dates passed (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C436736'] },
    () => {
      // Step 1: Check the 3 pieces in "Expected" accordion
      ReceivingDetails.verifyExpectedRecordsCount(3);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.pieceSummaries.first,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );
      ReceivingDetails.checkExpectedPieceStatus(
        testData.pieceSummaries.second,
        RECEIVING_PIECE_STATUSES.LATE,
      );
      ReceivingDetails.checkExpectedPieceStatus(
        testData.pieceSummaries.third,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );

      // Step 2: Click on "Pcs 1" record in "Expected" accordion
      ReceivingDetails.openEditPieceModal({ displaySummary: testData.pieceSummaries.first });
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.EXPECTED_RECEIPT_DATE,
          conditions: { value: testData.futureReceiptDate },
        },
      ]);

      // Step 3: Change "Expected receipt date" to a date in the past and click "Save & close"
      EditPieceModal.fillPieceDetails({
        [RECEIVING_PIECE_FORM_FIELD_LABELS.EXPECTED_RECEIPT_DATE]: testData.pastReceiptDate,
      });
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.getExpectedRowIndexByContent(testData.pieceSummaries.first).then(
        (rowIndex) => {
          ReceivingDetails.checkExpectedTableContent([
            { rowIndex, expectedReceiptDate: testData.pastReceiptDate },
          ]);
        },
      );

      // Step 4: Run "Pieces claiming batch job"
      cy.getAdminToken(false);
      Pieces.processClaimingViaApi().then((response) => {
        expect(response.status).to.equal(200);
      });
      cy.getUserToken(testData.user.username, testData.user.password);

      // Step 5: Check pieces statuses in "Expected" accordion after refreshing the page
      cy.reload();
      ReceivingDetails.waitLoading();
      ReceivingDetails.verifyExpectedRecordsCount(3);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.pieceSummaries.first,
        RECEIVING_PIECE_STATUSES.LATE,
      );
      ReceivingDetails.checkExpectedPieceStatus(
        testData.pieceSummaries.second,
        RECEIVING_PIECE_STATUSES.LATE,
      );
      ReceivingDetails.checkExpectedPieceStatus(
        testData.pieceSummaries.third,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );

      // Step 6: Click on "POL number" link on Title details pane
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.ONGOING },
        ],
      });

      // Step 7: Click on "Title" link on PO Line details pane
      OrderLineDetails.openInventoryItem();
      InventoryInstance.waitLoading();

      // Step 8: Expand "Holdings" accordion and check the "Status" column of 3 items
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location.name,
        records: [0, 1, 2].map(() => ({ status: ITEM_STATUS_NAMES.ON_ORDER })),
      });
    },
  );
});
