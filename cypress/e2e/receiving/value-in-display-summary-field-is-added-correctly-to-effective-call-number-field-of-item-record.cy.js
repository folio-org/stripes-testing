import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  HOLDING_RECEIVING_HISTORY,
  INVENTORY_ITEMS,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../support/constants';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import {
  InstanceRecordView,
  ItemRecordEdit,
  ItemRecordView,
} from '../../support/fragments/inventory';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

const PIECE_DETAILS_TO_FILL = {
  displaySummary: `Autotest_display_summary_${getRandomPostfix()}`,
};

const ITEM_DETAILS_TO_FILL = {
  callNumberPrefix: '1',
  callNumber: '2',
  callNumberSuffix: '3',
  volume: '4',
  enumeration: '5',
  chronology: '6',
  copyNumber: '7',
};

const UPDATED_DISPLAY_SUMMARY = `Item_1_${getRandomPostfix()}`;

const EXPECTED_EFFECTIVE_CALL_NUMBER = [
  ITEM_DETAILS_TO_FILL.callNumberPrefix,
  ITEM_DETAILS_TO_FILL.callNumber,
  ITEM_DETAILS_TO_FILL.callNumberSuffix,
  UPDATED_DISPLAY_SUMMARY,
  ITEM_DETAILS_TO_FILL.volume,
  ITEM_DETAILS_TO_FILL.enumeration,
  ITEM_DETAILS_TO_FILL.chronology,
  ITEM_DETAILS_TO_FILL.copyNumber,
].join(' ');

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    location: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    piece: {},
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

        return Receiving.getPiecesViaApi(orderLine.id);
      })
      .then((pieces) => {
        testData.piece = pieces[0];
      });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createOrganization().then(fetchReferenceData).then(createOrderWithOrderLine).then(openOrder);
    });

    cy.createTempUser([
      Permissions.uiReceivingViewEdit.gui,
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiInventoryViewCreateEditItems.gui,
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
        pieceIds: [testData.piece.id],
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
    'C436895 Value in "Display summary" field is added correctly to "Effective call number" field of "Item" record with public display settings (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C436895'] },
    () => {
      // Step 1: Click on the PO line Title hyperlink
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.waitLoading();
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 2: Click on the piece record in "Expected" accordion
      Receiving.selectRecordInExpectedList();
      EditPieceModal.waitLoading();
      EditPieceModal.verifyCheckboxPresent(
        RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_TO_PUBLIC,
        false,
      );

      // Step 3: Fill "Display summary" and check "Display on holding"
      EditPieceModal.fillPieceDetails({
        [RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_SUMMARY]: PIECE_DETAILS_TO_FILL.displaySummary,
      });
      EditPieceModal.checkDisplayOnHoldingCheckbox();
      EditPieceModal.verifyCheckboxState(
        RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_ON_HOLDING,
        true,
      );
      EditPieceModal.verifyCheckboxPresent(
        RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_TO_PUBLIC,
        true,
      );

      // Step 4: Check "Display to public"
      EditPieceModal.checkDisplayToPublicCheckbox();
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_TO_PUBLIC, true);

      // Step 5: Quick receive the piece via dropdown next to "Save & close"
      EditPieceModal.openActionsMenu();
      Receiving.quickReceivePieceFromDropdown();
      ReceivingDetails.waitLoading();
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.checkReceivedTableContent([
        { displaySummary: PIECE_DETAILS_TO_FILL.displaySummary },
      ]);

      // Step 6: Click Title link, navigate to Inventory
      Receiving.selectInstanceInReceive(testData.orderLine.titleOrPackage);
      InstanceRecordView.expandHoldings(testData.location.name);

      // Step 7: Click "View holdings" and verify "Receiving history" accordion
      InventoryInstance.viewHoldings();
      HoldingsRecordView.waitLoading();
      HoldingsRecordView.expandReceivingHistoryAccordion();
      HoldingsRecordView.checkReceivingHistoryValues({
        displaySummary: PIECE_DETAILS_TO_FILL.displaySummary,
        receiptDate: new Date().toLocaleDateString('en-US'),
        publicDisplay: true,
        source: HOLDING_RECEIVING_HISTORY.RECEIVING,
      });

      // Step 8: Close Holdings, open the item via "No barcode" link
      HoldingsRecordView.close();
      InventoryInstance.openHoldingItem({ name: testData.location.name });
      ItemRecordView.verifyItemStatusInPane(ITEM_STATUS_NAMES.IN_PROCESS);
      ItemRecordView.checkItemRecordDetails({
        enumerationData: [
          {
            label: INVENTORY_ITEMS.DISPLAY_SUMMARY,
            conditions: { value: PIECE_DETAILS_TO_FILL.displaySummary },
          },
        ],
      });
      ItemRecordView.verifyEffectiveCallNumber(PIECE_DETAILS_TO_FILL.displaySummary);

      // Step 9-10: Open item edit form and fill in call number/enumeration data fields
      ItemRecordView.openItemEditForm(testData.orderLine.titleOrPackage);
      ItemRecordEdit.fillItemRecordFields(ITEM_DETAILS_TO_FILL);

      // Step 11: Edit "Display summary" value
      ItemRecordEdit.addDisplaySummary(UPDATED_DISPLAY_SUMMARY);

      // Step 12: Save and verify the resulting "Effective call number"
      ItemRecordEdit.saveAndClose({ itemSaved: true });
      ItemRecordView.waitLoading();
      ItemRecordView.verifyEffectiveCallNumber(EXPECTED_EFFECTIVE_CALL_NUMBER);
    },
  );
});
