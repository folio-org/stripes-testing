import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ITEM_STATUS_NAMES,
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
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    // Default organization doesn't have any claiming integrations
    organization: {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C436743_Organization_${randomPostfix}`,
    },
    orderLineTitle: `AT_C436743_Title_${randomPostfix}`,
    pieceSummaries: {
      first: `AT_C436743_Pcs1_${randomPostfix}`,
      second: `AT_C436743_Pcs2_${randomPostfix}`,
    },
    tomorrowReceiptDateForApi: `${DateTools.getFormattedDate({ date: DateTools.addDays(1) })}T12:00:00.000+00:00`,
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
            const [firstPiece, secondPiece] = [...pieces].sort(
              (a, b) => a.sequenceNumber - b.sequenceNumber,
            );

            Pieces.updateOrderPieceViaApi({
              ...firstPiece,
              displaySummary: testData.pieceSummaries.first,
            });

            // Both pieces are "Claim sent" until tomorrow
            Pieces.updateOrderPiecesStatusesBatchViaApi({
              pieceIds: [firstPiece.id, secondPiece.id],
              receivingStatus: RECEIVING_PIECE_STATUSES.CLAIM_SENT,
              claimingInterval: 1,
            });

            // "Pcs 1" is set to "Unreceivable" after "Claim sent" status was set
            Pieces.updateOrderPiecesStatusesBatchViaApi({
              pieceIds: [firstPiece.id],
              receivingStatus: RECEIVING_PIECE_STATUSES.UNRECEIVABLE,
            });

            // "Pcs 1" has no "Expected receipt date"
            Pieces.getOrderPiecesViaApi({ query: `id==${firstPiece.id}` }).then(
              ({ pieces: [unreceivablePiece] }) => {
                expect(unreceivablePiece.receiptDate).to.equal(undefined);
              },
            );

            // "Pcs 2" gets "Expected receipt date" tomorrow and "statusUpdatedDate" in the past
            Pieces.getOrderPiecesViaApi({ query: `id==${secondPiece.id}` }).then(
              ({ pieces: [claimSentPiece] }) => {
                Pieces.updateOrderPieceViaApi({
                  ...claimSentPiece,
                  displaySummary: testData.pieceSummaries.second,
                  receiptDate: testData.tomorrowReceiptDateForApi,
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
    'C436743 Piece set to "Unreceivable" before expiration of "Claim sent" date remains in "Unreceivable" status after "Claim sent" date passed (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C436743'] },
    () => {
      // Step 1: Check the 2 pieces in "Expected" and "Unreceivable" accordions
      ReceivingDetails.verifyUnreceivableRecordsCount(1);
      ReceivingDetails.checkUnreceivableTableContent([
        { displaySummary: testData.pieceSummaries.first },
      ]);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.pieceSummaries.second,
        RECEIVING_PIECE_STATUSES.LATE,
      );

      // Step 2: Click on "POL number" link on Title details pane
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.ONGOING },
        ],
      });

      // Step 3: Click on "Title" link on PO Line details pane
      OrderLineDetails.openInventoryItem();
      InventoryInstance.waitLoading();

      // Step 4: Expand "Holdings" accordion and check the "Status" column of 2 items
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location.name,
        records: [0, 1].map(() => ({ status: ITEM_STATUS_NAMES.ON_ORDER })),
      });
    },
  );
});
