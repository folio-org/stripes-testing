import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  NO_BARCODE,
} from '../../support/constants';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import getRandomPostfix from '../../support/utils/stringTools';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

const barcode = `barcode_${getRandomPostfix()}`;

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    location: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    piece1: {},
    user: {},
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
  };

  const fetchReferenceData = () => {
    return cy
      .getLocations({ limit: 1, query: `name=${LOCATION_NAMES.MAIN_LIBRARY_UI}` })
      .then((location) => {
        testData.location = location;
      })
      .then(() => cy.getBookMaterialType())
      .then((materialType) => {
        testData.materialType = materialType;
      })
      .then(() => cy.getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      }))
      .then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
  };

  const createOrderWithOrderLine = () => {
    return Orders.createOrderViaApi({
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    })
      .then((orderResponse) => {
        testData.order = orderResponse;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: orderResponse.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            quantity: 2,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
        );
      })
      .then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;
      });
  };

  const openOrder = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.OPEN,
    })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine.id))
      .then((orderLine) => {
        testData.orderLine = orderLine;
      });
  };

  const receivePiece = () => {
    return Receiving.getPiecesViaApi(testData.orderLine.id)
      .then((pieces) => {
        testData.piece1 = pieces[0];
      })
      .then(() => Receiving.receivePieceViaApi({
        poLineId: testData.orderLine.id,
        pieces: [{ id: testData.piece1.id, barcode }],
      }));
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createOrganization()
        .then(fetchReferenceData)
        .then(createOrderWithOrderLine)
        .then(openOrder)
        .then(receivePiece);
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiReceivingViewEditDelete.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receiving.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Receiving.unreceivePiecesViaApi({
        poLineId: testData.orderLine.id,
        pieceIds: [testData.piece1.id],
      }).then(() => {
        Orders.updateOrderViaApi(
          {
            ...testData.order,
            workflowStatus: ORDER_STATUSES.PENDING,
          },
          true,
          false,
        );
        Orders.deleteOrderByOrderNumberViaApi(testData.order.poNumber);
        InventoryInstance.deleteInstanceViaApi(testData.orderLine.instanceId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });
  });

  it(
    'C436836 Change piece status from "Expected" to "Unreceivable" for one-time order with "2" quantity (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C436836'] },
    () => {
      // Steps 1: Search for the Title
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedTableContent([{ barcode }]);
      ReceivingDetails.verifyUnreceivableRecordsCount(0);

      // Step 2: Click on the expected piece record
      Receiving.selectRecordInExpectedList();
      EditPieceModal.waitLoading();
      EditPieceModal.verifyModalView();

      // Step 4: Change piece status to Unreceivable
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickUnreceivableButton();
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.verifyUnreceivableRecordsCount(1);

      // Step 5: Click on the unreciavable piece record
      Receiving.selectRecordInUnreceivableList();
      EditPieceModal.waitLoading();

      // Step 6: Click connected item link and check item status
      Receiving.selectConnectedInEditPiece();
      ItemRecordView.waitLoading();
      ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.ON_ORDER);

      // Step 7: Check Receipt status in PO line
      ItemRecordView.openHotlinkToPOL(testData.orderLine.poLineNumber);
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.FULLY_RECEIVED },
        ],
      });

      // Step 8: Check Item statuses in Inventory
      OrderLineDetails.openInventoryItem();
      InventoryInstance.waitLoading();
      InventoryInstance.openHoldingsAccordion(testData.location.name);
      InventoryInstance.checkItemStatusByBarcode(barcode, ITEM_STATUS_NAMES.IN_PROCESS);
      InventoryInstance.checkItemStatusByBarcode(NO_BARCODE, ITEM_STATUS_NAMES.ON_ORDER);
    },
  );
});
