import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  DELETE_HOLDINGS_ACTIONS,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIVING_PIECE_FORM_ACTIONS_LABELS,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import DeleteHoldingsModalReceivingFullScreen from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import DeletePieceModal from '../../support/fragments/receiving/modals/deletePieceModal';
import InteractorsTools from '../../support/utils/interactorsTools';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import PieceForm from '../../support/fragments/receiving/pieceForm';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

const {
  DELAY_CLAIM,
  DELETE,
  EXPECT,
  MARK_LATE,
  QUICK_RECEIVE,
  SAVE_AND_CREATE,
  SEND_CLAIM,
  UNRECEIVABLE,
} = RECEIVING_PIECE_FORM_ACTIONS_LABELS;

const EXPECTED_PIECE_ACTIONS = [
  SAVE_AND_CREATE,
  QUICK_RECEIVE,
  MARK_LATE,
  SEND_CLAIM,
  DELAY_CLAIM,
  UNRECEIVABLE,
  DELETE,
].map((option) => ({ option, disabled: false }));
const UNRECEIVABLE_PIECE_ACTIONS = [SAVE_AND_CREATE, EXPECT, DELETE].map((option) => ({
  option,
  disabled: false,
}));
// "Send claim" is not available for a piece which is not created yet
const NEW_PIECE_ACTIONS = [
  ...[SAVE_AND_CREATE, QUICK_RECEIVE, MARK_LATE, DELAY_CLAIM, UNRECEIVABLE].map((option) => ({
    option,
    disabled: false,
  })),
  { option: SEND_CLAIM, absent: true },
];

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

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingViewEdit.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.receivingPath,
          waiter: Receiving.waitLoading,
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
    'C844841 Dropdown on edit and add piece forms displays correct options (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C844841'] },
    () => {
      const { location1, location2 } = testData;

      // Step 1: Open the title
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 2: Open the piece, create new holdings for a different location
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.clickCreateNewholdingsForLocation();
      SelectLocationModal.selectLocation(location2.name);
      EditPieceModal.verifySelectedLocation(location2.name);

      // Step 3: Expand the dropdown next to "Save & close" button
      EditPieceModal.openActionsMenu();
      EditPieceModal.verifyActionsMenuOptionsStates(EXPECTED_PIECE_ACTIONS);

      // Steps 4-5: Select "Unreceivable" option, cancel deleting the holding
      EditPieceModal.clickUnreceivableButton(false);
      DeleteHoldingsModalReceivingFullScreen.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.CANCEL,
      });
      EditPieceModal.verifySelectedLocation(location2.name);

      // Step 6: Expand the dropdown next to "Save & close" button
      EditPieceModal.openActionsMenu();
      EditPieceModal.verifyActionsMenuOptionsStates(EXPECTED_PIECE_ACTIONS);

      // Steps 7-8: Select "Unreceivable" option, delete the holding which becomes empty
      EditPieceModal.clickUnreceivableButton(false);
      DeleteHoldingsModalReceivingFullScreen.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.DELETE_HOLDINGS,
      });
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyUnreceivableRecordsCount(1);

      // Step 9: Open the unreceivable piece, its holding is not editable
      Receiving.selectRecordInUnreceivableList();
      EditPieceModal.waitLoading();
      EditPieceModal.verifySelectedHolding(location2.name, { isEditable: false });

      // Step 10: Expand the dropdown next to "Save & close" button
      EditPieceModal.openActionsMenu();
      EditPieceModal.verifyActionsMenuOptionsStates(UNRECEIVABLE_PIECE_ACTIONS);

      // Step 11: Close the piece, open "Add piece" form
      EditPieceModal.clickCancelButton();
      Receiving.addPieceInActions();
      PieceForm.waitLoading();

      // Step 12: Expand the dropdown next to "Save & close" button
      EditPieceModal.openActionsMenu();
      EditPieceModal.verifyActionsMenuOptionsStates(NEW_PIECE_ACTIONS);

      // Step 13: Create the piece with an item in the new holding for the PO line location
      EditPieceModal.checkCreateItemCheckbox();
      EditPieceModal.clickCreateNewholdingsForLocation();
      SelectLocationModal.selectLocation(location1.name);
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyUnreceivableRecordsCount(1);

      // Steps 14-15: Delete the unreceivable piece, keep its holding
      Receiving.selectRecordInUnreceivableList();
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDeleteButton();
      DeletePieceModal.clickDeleteItemButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyUnreceivableRecordsCount(0);

      // Step 16: Open PO line details, the line has one location with quantity 1
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        costDetails: [{ key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' }],
        locationDetails: {
          locations: [
            [
              { key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: location1.name },
              { key: POLINE_DETAILS_FIELDS.QUANTITY_PHYSICAL, value: '1' },
            ],
          ],
        },
      });
      OrderLineDetails.verifyLocationAbsentInSection(location2.name);

      // Step 17: Open the instance with two holdings, only one of them has an item
      OrderLineDetails.openInventoryItem();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(2);
      InventoryInstance.verifyNumberOfItemsInHoldingByName(location1.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: location1.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });
      InstanceRecordView.verifyItemsListIsEmpty(location2.name);
    },
  );
});
