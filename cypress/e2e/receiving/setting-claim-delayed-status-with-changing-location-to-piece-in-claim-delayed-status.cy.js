import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  DELETE_HOLDINGS_ACTIONS,
  ITEM_STATUS_NAMES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import DateTools from '../../support/utils/dateTools';
import DelayClaimModal from '../../support/fragments/receiving/modals/delayClaimModal';
import DeleteHoldingsModalReceivingFullScreen from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

const { DISPLAY_ON_HOLDING } = RECEIVING_PIECE_FORM_FIELD_LABELS;

const today = new Date();
const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
const delayToDate = DateTools.getFormattedDate({ date: nextYear }, 'MM/DD/YYYY');

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    servicePoint: {},
    location1: {},
    location2: {},
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

  const createLocation = (locationKey) => {
    const { location } = Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id });

    return Locations.createViaApi(location).then(() => {
      testData[locationKey] = location;
    });
  };

  const createLocations = () => {
    return ServicePoints.getCircDesk1ServicePointViaApi()
      .then((servicePoint) => {
        testData.servicePoint = servicePoint;

        return createLocation('location1');
      })
      .then(() => createLocation('location2'));
  };

  const fetchReferenceData = () => {
    return cy
      .getBookMaterialType()
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
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location1.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
        );
      })
      .then((orderLine) => {
        testData.orderLine = orderLine;
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

  // The piece is marked late first and then gets "Claim delayed" status
  const delayClaimForPiece = () => {
    return Receiving.getPiecesViaApi(testData.orderLine.id).then(([piece]) => {
      return Pieces.updateOrderPiecesStatusesBatchViaApi({
        pieceIds: [piece.id],
        receivingStatus: RECEIVING_PIECE_STATUSES.LATE,
      }).then(() => Pieces.updateOrderPiecesStatusesBatchViaApi({
        pieceIds: [piece.id],
        receivingStatus: RECEIVING_PIECE_STATUSES.CLAIM_DELAYED,
        claimingInterval: 1,
      }));
    });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingViewEdit.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    createOrganization()
      .then(createLocations)
      .then(fetchReferenceData)
      .then(createOrderWithOrderLine)
      .then(openOrder)
      .then(delayClaimForPiece)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.getOrderByIdViaApi(testData.order.id).then((order) => {
      Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.PENDING }, true, false);
    });
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    [testData.location1, testData.location2].forEach((location) => {
      Locations.deleteViaApi(location);
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C423985 Setting "Claim delayed" status (with changing location) to a Piece in "Claim delayed" status (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C423985'] },
    () => {
      const { location1, location2 } = testData;

      // Step 1: Open the order
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Click "Actions" button and select "Receive"
      OrderDetails.openReceivingsPage();

      // Step 3: Open the title
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedTableContent([
        { status: RECEIVING_PIECE_STATUSES.CLAIM_DELAYED },
      ]);

      // Step 4: Open the piece in "Expected" accordion
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();

      // Steps 5-6: Create new holdings for a different location
      EditPieceModal.clickCreateNewholdingsForLocation();
      SelectLocationModal.selectLocation(location2.name);
      EditPieceModal.verifySelectedLocation(location2.name);

      // Step 7: Check "Display on holding" checkbox
      EditPieceModal.checkDisplayOnHoldingCheckbox();
      EditPieceModal.verifyCheckboxState(DISPLAY_ON_HOLDING, true);

      // Steps 8-9: Open "Delay claim" modal, specify a date in the next year
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDelayClaimButton();
      DelayClaimModal.verifyModalView();
      DelayClaimModal.fillDelayToDate(delayToDate);

      // Step 10: Cancel delaying the claim, changes made in the piece are kept
      DelayClaimModal.clickCancelButton();
      EditPieceModal.waitLoading();
      EditPieceModal.verifySelectedLocation(location2.name);
      EditPieceModal.verifyCheckboxState(DISPLAY_ON_HOLDING, true);

      // Steps 11-12: Open "Delay claim" modal again, specify a date in the next year
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDelayClaimButton();
      DelayClaimModal.verifyModalView();
      DelayClaimModal.fillDelayToDate(delayToDate);

      // Steps 13-14: Delay the claim, delete the holding which will no longer contain pieces or items
      // "Delete Holdings" modal opens over "Delay claim" modal, which is closed after the holding is deleted
      DelayClaimModal.clickSaveAndCloseButton({ closed: false });
      DeleteHoldingsModalReceivingFullScreen.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.DELETE_HOLDINGS,
      });
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      ReceivingDetails.checkExpectedTableContent([
        { status: RECEIVING_PIECE_STATUSES.CLAIM_DELAYED, holdingsLocation: location2.name },
      ]);

      // Step 15: Click on the title name link, the holding from the PO line is deleted
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.verifyHoldingsAbsent(location1.name);
      InventoryInstance.verifyNumberOfItemsInHoldingByName(location2.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: location2.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });
    },
  );
});
