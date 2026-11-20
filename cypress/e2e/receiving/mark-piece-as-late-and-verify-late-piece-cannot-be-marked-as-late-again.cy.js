import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  CLAIMING_FILTER_LABELS,
  CLAIMING_RESULTS_LIST_COLUMNS,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
  RECEIVING_PIECE_FORM_ACCORDIONS_LABELS,
  RECEIVING_PIECE_FORM_ACTIONS_LABELS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import Claiming from '../../support/fragments/claiming/claiming';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import {
  ReceivingDetails,
  Receivings,
  ReceivingsListEditForm,
} from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  const randomPostfix = getRandomPostfix();
  const testData = {
    organization: {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C656338_Organization_${randomPostfix}`,
    },
    orderLineTitle: `AT_C656338_Title_${randomPostfix}`,
    firstPieceSummary: `AT_C656338_Pcs1_${randomPostfix}`,
    secondPieceSummary: `AT_C656338_Pcs2_${randomPostfix}`,
    location: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    user: {},
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
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
          claimingActive: true,
          claimingInterval: 1,
        }).then((orderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.orderLine = openedOrderLine;
          });

          Pieces.getOrderPiecesViaApi({ query: `poLineId==${orderLine.id}` }).then(
            ({ pieces: [piece] }) => {
              Pieces.updateOrderPieceViaApi({
                ...piece,
                displaySummary: testData.firstPieceSummary,
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
          CapabilitySets.uiInventory,
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiReceivingEdit,
          CapabilitySets.uiClaimsClaimingView,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', testData.order.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Receivings.getPiecesViaApi(testData.orderLine.id).then((pieces) => {
      Receivings.unreceivePiecesViaApi({
        poLineId: testData.orderLine.id,
        pieceIds: pieces.map(({ id }) => id),
      });
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
    'C656338 Mark piece as late and verify that late piece cannot be marked as late for the second time (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C656338'] },
    () => {
      // Step 1: Click on the order from precondition
      Orders.selectFromResultsList(testData.order.poNumber);
      Orders.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Click "Actions" -> "Receive"
      Orders.receiveOrderViaActions();
      Receivings.checkIsPiecesCreated(testData.orderLineTitle);

      // Step 3: Click on the title record
      Receivings.selectFromResultsList(testData.orderLineTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLineTitle);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.firstPieceSummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );

      // Step 4: Click on the record in "Expected" accordion
      ReceivingDetails.openEditPieceModal({ displaySummary: testData.firstPieceSummary });
      EditPieceModal.waitLoading();

      // Step 5: Select "Mark late" option
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickMarkLateButton();
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.firstPieceSummary,
        RECEIVING_PIECE_STATUSES.LATE,
      );

      // Step 6: Open the record and expand "Status log" accordion
      ReceivingDetails.openEditPieceModal({ displaySummary: testData.firstPieceSummary });
      EditPieceModal.waitLoading();
      EditPieceModal.expandAccordion(RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.STATUS_LOG);
      EditPieceModal.checkStatusLogContent([
        { status: RECEIVING_PIECE_STATUSES.LATE },
        { status: RECEIVING_PIECE_STATUSES.EXPECTED },
      ]);

      // Step 7: "Mark late" option is not present in the dropdown
      EditPieceModal.openActionsMenu();
      EditPieceModal.verifyActionsMenuOptionsStates([
        { option: RECEIVING_PIECE_FORM_ACTIONS_LABELS.MARK_LATE, absent: true },
      ]);

      // Step 8: Close "Edit piece" form, open "Add piece" form
      EditPieceModal.clickCancelButton();
      Receivings.addPieceInActions();
      EditPieceModal.waitLoading();

      // Step 9: Fill in "Display summary", check "Create item", select "Mark late"
      EditPieceModal.fillPieceDetails({
        [RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_SUMMARY]: testData.secondPieceSummary,
      });
      EditPieceModal.checkCreateItemCheckbox();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickMarkLateButton();
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.firstPieceSummary,
        RECEIVING_PIECE_STATUSES.LATE,
      );
      ReceivingDetails.checkExpectedPieceStatus(
        testData.secondPieceSummary,
        RECEIVING_PIECE_STATUSES.LATE,
      );

      // Step 10: Receive both pieces
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.receiveAll();
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(2);

      // Step 11: Unreceive both pieces
      Receivings.unreceiveFromReceivedSection();
      Receivings.unreceiveAll();
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.firstPieceSummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );
      ReceivingDetails.checkExpectedPieceStatus(
        testData.secondPieceSummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );

      // Step 12: Mark the newly added piece as late
      ReceivingDetails.openEditPieceModal({ displaySummary: testData.secondPieceSummary });
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickMarkLateButton();
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.checkExpectedPieceStatus(
        testData.secondPieceSummary,
        RECEIVING_PIECE_STATUSES.LATE,
      );
      ReceivingDetails.checkExpectedPieceStatus(
        testData.firstPieceSummary,
        RECEIVING_PIECE_STATUSES.EXPECTED,
      );

      // Step 13: Open the "Late" piece and expand "Status log" accordion
      ReceivingDetails.openEditPieceModal({ displaySummary: testData.secondPieceSummary });
      EditPieceModal.waitLoading();
      EditPieceModal.expandAccordion(RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.STATUS_LOG);
      EditPieceModal.checkStatusLogContent([
        { status: RECEIVING_PIECE_STATUSES.LATE },
        { status: RECEIVING_PIECE_STATUSES.EXPECTED },
        { status: RECEIVING_PIECE_STATUSES.RECEIVED },
        { status: RECEIVING_PIECE_STATUSES.LATE },
      ]);

      // Step 14: "Mark late" option is not present in the dropdown
      EditPieceModal.openActionsMenu();
      EditPieceModal.verifyActionsMenuOptionsStates([
        { option: RECEIVING_PIECE_FORM_ACTIONS_LABELS.MARK_LATE, absent: true },
      ]);

      // Step 15: Close "Edit piece" form, find the late piece in "Claiming" app
      // The "POL claim active" filter is no longer available in "Claiming" app after UICLAIM-29
      EditPieceModal.clickCancelButton();
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CLAIMING);
      Claiming.waitLoading();
      Claiming.assertCheckboxFilterValues(CLAIMING_FILTER_LABELS.RECEIVING_STATUS, [
        RECEIVING_PIECE_STATUSES.LATE,
      ]);
      Claiming.searchByTitle(testData.orderLineTitle);
      Claiming.assertClaimingResults([
        [
          { column: CLAIMING_RESULTS_LIST_COLUMNS.STATUS, content: RECEIVING_PIECE_STATUSES.LATE },
          { column: CLAIMING_RESULTS_LIST_COLUMNS.TITLE, content: testData.orderLineTitle },
          {
            column: CLAIMING_RESULTS_LIST_COLUMNS.DISPLAY_SUMMARY,
            content: testData.secondPieceSummary,
          },
        ],
      ]);

      // Step 16: Go back to "Receiving" app and receive both pieces
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receivings.searchByParameter({ value: testData.orderLineTitle });
      Receivings.selectFromResultsList(testData.orderLineTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLineTitle);
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.receiveAll();
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(2);

      // Step 17: Click on the title link and check the items in Inventory
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location.name, 2);
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location.name,
        records: [
          { status: ITEM_STATUS_NAMES.IN_PROCESS },
          { status: ITEM_STATUS_NAMES.IN_PROCESS },
        ],
      });
    },
  );
});
