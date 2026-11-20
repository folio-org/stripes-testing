import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstances, ItemRecordView } from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { PieceForm, ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    organization: {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C436808_Organization_${randomPostfix}`,
    },
    orderLineTitle: `AT_C436808_Title_${randomPostfix}`,
    pieceSummary: `AT_C436808_Pcs1_${randomPostfix}`,
    pastReceiptDateForApi: `${DateTools.getFormattedDate({ date: DateTools.addDays(-3) })}T12:00:00.000+00:00`,
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
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.orderLineTitle,
            quantity: 1,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
          claimingActive: false,
        }).then((orderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.orderLine = openedOrderLine;
          });

          // "Expected receipt date" of the piece is in the past
          Pieces.getOrderPiecesViaApi({ query: `poLineId==${orderLine.id}` }).then(
            ({ pieces: [piece] }) => {
              Pieces.updateOrderPieceViaApi({
                ...piece,
                displaySummary: testData.pieceSummary,
                receiptDate: testData.pastReceiptDateForApi,
              });
            },
          );
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
        waiter: Receivings.waitLoading,
      });
      Receivings.searchByParameter({ value: testData.orderLineTitle });
      Receivings.selectFromResultsList(testData.orderLineTitle);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
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
    'C436808 Piece status has not been changed if "Claiming active" option is NOT active (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C436808'] },
    () => {
      // Step 1: Check the piece in "Expected" accordion
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.pieceSummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );

      // Step 2: Click on the piece record in "Expected" accordion
      ReceivingDetails.openEditPieceModal({ displaySummary: testData.pieceSummary });
      EditPieceModal.waitLoading();

      // Step 3: Click "Connected" link in "Piece details" accordion
      PieceForm.clickConnectedItemLink();
      ItemRecordView.waitLoading();
      ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.ON_ORDER);

      // Step 4: Click "POL number" link in "Acquisition" accordion
      ItemRecordView.openHotlinkToPOL(testData.orderLine.poLineNumber);
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
            value: RECEIPT_STATUS_VIEW.AWAITING_RECEIPT,
          },
        ],
      });
    },
  );
});
