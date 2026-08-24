import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  HOLDING_RECEIVING_HISTORY,
  ITEM_STATUS_NAMES,
  INVENTORY_ITEMS,
  LOCATION_NAMES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../support/constants';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import { ItemRecordView } from '../../support/fragments/inventory';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

const PIECE_DETAILS_TO_FILL = {
  displaySummary: 'Autotest display summary',
  copyNumber: '1',
  enumeration: 'v.1',
  chronology: '2024',
  comment: 'Autotest comment',
  barcode: `autotest-barcode-${getRandomPostfix()}`,
  callNumber: `autotest-call-number-${getRandomPostfix()}`,
  accessionNumber: `autotest-accession-number-${getRandomPostfix()}`,
};

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    location: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
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
      reEncumber: true,
    })
      .then((orderResponse) => {
        testData.order = orderResponse;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: orderResponse.id,
            acquisitionMethod: testData.acquisitionMethod.id,
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

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createOrganization().then(fetchReferenceData).then(createOrderWithOrderLine).then(openOrder);
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiReceivingViewEdit.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Receiving.getPiecesViaApi(testData.orderLine.id).then((pieces) => {
        Receiving.unreceivePiecesViaApi({
          poLineId: testData.orderLine.id,
          pieceIds: pieces.map((piece) => piece.id),
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
  });

  it(
    'C464323 Fields become filled in Item record after populating in Piece record with "Display to public" false and "Display on holdings" true when receiving a piece (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C464323'] },
    () => {
      // Steps 1-2: Search for the order, open it, and receive it
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();
      Orders.receiveOrderViaActions();
      Receiving.selectLinkFromResultsList();

      // Step 3: Click on the piece and verify checkboxes presence and state
      Receiving.selectRecordInExpectedList();
      EditPieceModal.waitLoading();
      EditPieceModal.verifyModalView();
      EditPieceModal.verifyCheckboxPresent(
        RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_ON_HOLDING,
        true,
      );
      EditPieceModal.verifyCheckboxPresent(
        RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_TO_PUBLIC,
        false,
      );

      // Step 4: Check "Display on holdings" and verify "Display to public" checkbox becomes visible
      EditPieceModal.checkDisplayOnHoldingCheckbox();
      EditPieceModal.verifyCheckboxPresent(
        RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_TO_PUBLIC,
        true,
      );
      EditPieceModal.verifyCheckboxState(
        RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_ON_HOLDING,
        true,
      );

      // Step 5-6: Fill in piece details
      EditPieceModal.fillPieceDetails({
        [RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_SUMMARY]: PIECE_DETAILS_TO_FILL.displaySummary,
        [RECEIVING_PIECE_FORM_FIELD_LABELS.COPY_NUMBER]: PIECE_DETAILS_TO_FILL.copyNumber,
        [RECEIVING_PIECE_FORM_FIELD_LABELS.ENUMERATION]: PIECE_DETAILS_TO_FILL.enumeration,
        [RECEIVING_PIECE_FORM_FIELD_LABELS.CHRONOLOGY]: PIECE_DETAILS_TO_FILL.chronology,
        [RECEIVING_PIECE_FORM_FIELD_LABELS.COMMENTS]: PIECE_DETAILS_TO_FILL.comment,
        [RECEIVING_PIECE_FORM_FIELD_LABELS.BARCODE]: PIECE_DETAILS_TO_FILL.barcode,
        [RECEIVING_PIECE_FORM_FIELD_LABELS.CALL_NUMBER]: PIECE_DETAILS_TO_FILL.callNumber,
        [RECEIVING_PIECE_FORM_FIELD_LABELS.ACCESSION_NUMBER]: PIECE_DETAILS_TO_FILL.accessionNumber,
      });

      // Step 7: Receive the piece
      EditPieceModal.openActionsMenu();
      Receiving.quickReceivePieceFromDropdown();

      // Step 8: Click Title link and verify holding table content
      Receiving.selectInstanceInReceive(testData.orderLine.titleOrPackage);
      InventoryInstance.checkHoldingsTableContent({
        name: LOCATION_NAMES.MAIN_LIBRARY_UI,
        records: [
          {
            barcode: PIECE_DETAILS_TO_FILL.barcode,
            status: ITEM_STATUS_NAMES.IN_PROCESS,
            copyNumber: PIECE_DETAILS_TO_FILL.copyNumber,
            enumeration: PIECE_DETAILS_TO_FILL.enumeration,
            chronology: PIECE_DETAILS_TO_FILL.chronology,
          },
        ],
      });

      // Step 9: Open item record and verify item details
      InventoryInstance.openItemByBarcode(PIECE_DETAILS_TO_FILL.barcode);
      ItemRecordView.checkItemRecordDetails({
        administrativeData: [
          { label: INVENTORY_ITEMS.BARCODE, conditions: { value: PIECE_DETAILS_TO_FILL.barcode } },
          {
            label: INVENTORY_ITEMS.ACCESSION_NUMBER,
            conditions: { value: PIECE_DETAILS_TO_FILL.accessionNumber },
          },
        ],
        itemData: [
          {
            label: INVENTORY_ITEMS.CALL_NUMBER,
            conditions: { value: PIECE_DETAILS_TO_FILL.callNumber },
          },
          {
            label: INVENTORY_ITEMS.COPY_NUMBER,
            conditions: { value: PIECE_DETAILS_TO_FILL.copyNumber },
          },
        ],
        enumerationData: [
          {
            label: INVENTORY_ITEMS.DISPLAY_SUMMARY,
            conditions: { value: PIECE_DETAILS_TO_FILL.displaySummary },
          },
          {
            label: INVENTORY_ITEMS.CHRONOLOGY,
            conditions: { value: PIECE_DETAILS_TO_FILL.chronology },
          },
          {
            label: INVENTORY_ITEMS.ENUMERATION,
            conditions: { value: PIECE_DETAILS_TO_FILL.enumeration },
          },
        ],
      });

      // Step 10-11: Open holding record and verify "Receiving history" accordion
      ItemRecordView.closeDetailView();
      InventoryInstance.viewHoldings();
      HoldingsRecordView.waitLoading();
      HoldingsRecordView.checkReceivingHistoryValues({
        displaySummary: PIECE_DETAILS_TO_FILL.displaySummary,
        copyNumber: PIECE_DETAILS_TO_FILL.copyNumber,
        enumeration: PIECE_DETAILS_TO_FILL.enumeration,
        chronology: PIECE_DETAILS_TO_FILL.chronology,
        comment: PIECE_DETAILS_TO_FILL.comment,
        receiptDate: new Date().toLocaleDateString('en-US'),
        publicDisplay: false,
        source: HOLDING_RECEIVING_HISTORY.RECEIVING,
      });
    },
  );
});
