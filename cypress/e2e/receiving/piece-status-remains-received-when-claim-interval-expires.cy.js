import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  RECEIVING_PIECE_FORMATS,
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
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    organization: {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C436801_Organization_${randomPostfix}`,
    },
    orderLineTitle: `AT_C436801_Title_${randomPostfix}`,
    receivedPiece: {
      displaySummary: `AT_C436801_Pcs1_${randomPostfix}`,
      barcode: `AT_C436801_Pcs1_Barcode_${randomPostfix}`,
    },
    claimSentPiece: {
      displaySummary: `AT_C436801_Pcs2_${randomPostfix}`,
      barcode: `AT_C436801_Pcs2_Barcode_${randomPostfix}`,
    },
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

        const defaultOrderLine = BasicOrderLine.getDefaultOrderLine({
          title: testData.orderLineTitle,
          purchaseOrderId: order.id,
          acquisitionMethod: testData.acquisitionMethod.id,
          specialLocationId: testData.location.id,
          specialMaterialTypeId: testData.materialType.id,
        });

        // P/E mix order line with quantity 2: 1 physical and 1 electronic piece
        OrderLines.createOrderLineViaApi({
          ...defaultOrderLine,
          orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
          locations: [
            { locationId: testData.location.id, quantityPhysical: 1, quantityElectronic: 1 },
          ],
          cost: {
            ...defaultOrderLine.cost,
            listUnitPriceElectronic: 1,
            quantityPhysical: 1,
            quantityElectronic: 1,
          },
          eresource: {
            ...defaultOrderLine.eresource,
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
            accessProvider: testData.organization.id,
          },
          claimingActive: true,
          claimingInterval: 1,
        }).then((orderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.orderLine = openedOrderLine;
          });

          Receiving.getPiecesViaApi(orderLine.id).then((pieces) => {
            const physicalPiece = pieces.find(
              ({ format }) => format === RECEIVING_PIECE_FORMATS.PHYSICAL,
            );
            const electronicPiece = pieces.find(
              ({ format }) => format === RECEIVING_PIECE_FORMATS.ELECTRONIC,
            );
            testData.receivedPiece.id = physicalPiece.id;
            testData.claimSentPiece.id = electronicPiece.id;

            Pieces.updateOrderPieceViaApi({
              ...physicalPiece,
              displaySummary: testData.receivedPiece.displaySummary,
              barcode: testData.receivedPiece.barcode,
            });
            Pieces.updateOrderPieceViaApi({
              ...electronicPiece,
              displaySummary: testData.claimSentPiece.displaySummary,
              barcode: testData.claimSentPiece.barcode,
            });

            // Both pieces are "Claim sent" until tomorrow
            Pieces.updateOrderPiecesStatusesBatchViaApi({
              pieceIds: [physicalPiece.id, electronicPiece.id],
              receivingStatus: RECEIVING_PIECE_STATUSES.CLAIM_SENT,
              claimingInterval: 1,
            });

            // "Pcs 1" is received after "Claim sent" status was set
            Receiving.receivePieceViaApi({
              poLineId: orderLine.id,
              pieces: [{ id: physicalPiece.id }],
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
      pieceIds: [testData.receivedPiece.id],
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
    'C436801 Piece status remains "Received" when claim interval expires (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C436801'] },
    () => {
      // Step 1: Check pieces on "<Title name>" pane
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.claimSentPiece.displaySummary,
        RECEIVING_PIECE_STATUSES.CLAIM_SENT,
      );
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedPiecesPresent([testData.receivedPiece.barcode]);

      // Step 2: Click on "POL number" link on Title details pane
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
            value: RECEIPT_STATUS_VIEW.PARTIALLY_RECEIVED,
          },
        ],
      });

      // Step 3: Click on "Title" link on PO Line details pane
      OrderLineDetails.openInventoryItem();
      InventoryInstance.waitLoading();

      // Step 4: Expand "Holdings" accordion and check the "Status" column of 2 items
      InventoryInstance.openHoldingsAccordion(testData.location.name);
      InventoryInstance.checkItemStatusByBarcode(
        testData.receivedPiece.barcode,
        ITEM_STATUS_NAMES.IN_PROCESS,
      );
      InventoryInstance.checkItemStatusByBarcode(
        testData.claimSentPiece.barcode,
        ITEM_STATUS_NAMES.ON_ORDER,
      );
    },
  );
});
