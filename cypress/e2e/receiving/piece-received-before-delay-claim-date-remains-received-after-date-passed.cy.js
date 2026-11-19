import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  NO_BARCODE,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
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
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    organization: {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C436739_Organization_${randomPostfix}`,
    },
    orderLineTitle: `AT_C436739_Title_${randomPostfix}`,
    pieceSummaries: {
      first: `AT_C436739_Pcs1_${randomPostfix}`,
      second: `AT_C436739_Pcs2_${randomPostfix}`,
    },
    receivedPieceBarcode: `AT_C436739_Barcode_${randomPostfix}`,
    // At least "claimingInterval" + 1 days before the current date
    pastStatusUpdatedDate: DateTools.addDays(-3).toISOString(),
    location: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    pieces: [],
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
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.orderLineTitle,
            quantity: 2,
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
            testData.pieces = [...pieces].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
            const [firstPiece, secondPiece] = testData.pieces;

            // Both pieces are "Claim delayed" until tomorrow
            Pieces.updateOrderPiecesStatusesBatchViaApi({
              pieceIds: [firstPiece.id, secondPiece.id],
              receivingStatus: RECEIVING_PIECE_STATUSES.CLAIM_DELAYED,
              claimingInterval: 1,
            });
            Pieces.getOrderPiecesViaApi({ query: `id==${firstPiece.id}` }).then(
              ({ pieces: [claimDelayedPiece] }) => {
                Pieces.updateOrderPieceViaApi({
                  ...claimDelayedPiece,
                  displaySummary: testData.pieceSummaries.first,
                });
              },
            );

            // "Pcs 2" gets "statusUpdatedDate" in the past and then is received
            Pieces.getOrderPiecesViaApi({ query: `id==${secondPiece.id}` }).then(
              ({ pieces: [claimDelayedPiece] }) => {
                Pieces.updateOrderPieceViaApi({
                  ...claimDelayedPiece,
                  displaySummary: testData.pieceSummaries.second,
                  statusUpdatedDate: testData.pastStatusUpdatedDate,
                });
              },
            );
            Receiving.receivePieceViaApi({
              poLineId: orderLine.id,
              pieces: [{ id: secondPiece.id, barcode: testData.receivedPieceBarcode }],
            });
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
    Receiving.unreceivePiecesViaApi({
      poLineId: testData.orderLine.id,
      pieceIds: [testData.pieces[1].id],
    });
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
    'C436739 Piece received before expiration of "Delay claim" date remains in "Received" status after "Delay claim" date passed (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C436739'] },
    () => {
      // Step 1: Check the first piece in "Expected" accordion ("Pcs 1")
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.pieceSummaries.first,
        RECEIVING_PIECE_STATUSES.CLAIM_DELAYED,
      );

      // Step 2: Check the second piece in "Received" accordion ("Pcs 2")
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedPiecesPresent([testData.receivedPieceBarcode]);

      // Step 3: Click on "POL number" link on Title details pane
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
            value: RECEIPT_STATUS_VIEW.PARTIALLY_RECEIVED,
          },
        ],
      });

      // Step 4: Click on "Title" link on PO Line details pane
      OrderLineDetails.openInventoryItem();
      InventoryInstance.waitLoading();

      // Step 5: Expand "Holdings" accordion and check the "Status" column of 2 items
      InventoryInstance.openHoldingsAccordion(testData.location.name);
      InventoryInstance.checkItemStatusByBarcode(NO_BARCODE, ITEM_STATUS_NAMES.ON_ORDER);
      InventoryInstance.checkItemStatusByBarcode(
        testData.receivedPieceBarcode,
        ITEM_STATUS_NAMES.IN_PROCESS,
      );

      // Step 6: Change "Pcs 1" "statusUpdatedDate" to the past and run "Pieces claiming batch job"
      cy.getAdminToken(false);
      Pieces.getOrderPiecesViaApi({ query: `id==${testData.pieces[0].id}` }).then(
        ({ pieces: [claimDelayedPiece] }) => {
          Pieces.updateOrderPieceViaApi({
            ...claimDelayedPiece,
            statusUpdatedDate: testData.pastStatusUpdatedDate,
          });
        },
      );
      Pieces.processClaimingViaApi().then((response) => {
        expect(response.status).to.equal(200);
      });
      cy.getUserToken(testData.user.username, testData.user.password);

      // Step 7: Back to the Title details pane, refresh the page and check pieces statuses
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receiving.searchByParameter({ value: testData.orderLineTitle });
      Receiving.selectFromResultsList(testData.orderLineTitle);
      ReceivingDetails.waitLoading();
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.pieceSummaries.first,
        RECEIVING_PIECE_STATUSES.LATE,
      );
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedPiecesPresent([testData.receivedPieceBarcode]);

      // Step 8: Click on "POL number" link on Title details pane
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
            value: RECEIPT_STATUS_VIEW.PARTIALLY_RECEIVED,
          },
        ],
      });

      // Step 9: Click on "Title" link on PO Line details pane
      OrderLineDetails.openInventoryItem();
      InventoryInstance.waitLoading();

      // Step 10: Expand "Holdings" accordion and check the "Status" column of 2 items
      InventoryInstance.openHoldingsAccordion(testData.location.name);
      InventoryInstance.checkItemStatusByBarcode(NO_BARCODE, ITEM_STATUS_NAMES.ON_ORDER);
      InventoryInstance.checkItemStatusByBarcode(
        testData.receivedPieceBarcode,
        ITEM_STATUS_NAMES.IN_PROCESS,
      );
    },
  );
});
