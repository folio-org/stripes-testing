import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  DELETE_HOLDINGS_ACTIONS,
  ITEM_STATUS_NAMES,
  NO_VALUE,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  RECEIVING_PIECE_FORM_ACCORDIONS_LABELS,
  RECEIVING_PIECE_FORM_ACTIONS_LABELS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import DateTools from '../../support/utils/dateTools';
import DeleteHoldingsModalReceivingFullScreen from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InteractorsTools from '../../support/utils/interactorsTools';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import Permissions from '../../support/dictionary/permissions';
import SendClaimModal from '../../support/fragments/receiving/modals/sendClaimModal';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import { formatDate } from '../../support/utils/acquisitions';

const { DISPLAY_ON_HOLDING, EXTERNAL_NOTE } = RECEIVING_PIECE_FORM_FIELD_LABELS;

const today = new Date();
const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
const claimExpiryDates = {
  today: DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY'),
  tomorrow: DateTools.getTomorrowDayDateForFiscalYear(),
  nextYear: DateTools.getFormattedDate({ date: nextYear }, 'MM/DD/YYYY'),
};
const externalNote = `AT_C423997_external_note_${getRandomPostfix()}`;

const getUserName = ({ personal }) => `${personal.lastName}, ${personal.firstName}`;

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
    adminUser: {},
    locale: {},
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
      })
      .then(() => cy.getTenantLocaleApi())
      .then((locale) => {
        testData.locale = locale;
      })
      .then(() => cy.getAdminUserDetails())
      .then((adminUser) => {
        testData.adminUser = adminUser;
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

  const sendClaimForPiece = () => {
    return Receiving.getPiecesViaApi(testData.orderLine.id).then(([piece]) => {
      return Pieces.updateOrderPiecesStatusesBatchViaApi({
        pieceIds: [piece.id],
        receivingStatus: RECEIVING_PIECE_STATUSES.CLAIM_SENT,
        claimingInterval: 5,
      });
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
      .then(sendClaimForPiece)
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
    'C423997 Receive and unrecieve action after setting "Claim sent" status (with changing location) to a Piece in "Claim sent" status (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C423997'] },
    () => {
      const { location1, location2 } = testData;

      // Step 1: Open the order, select "Receive" in "Actions"
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.openReceivingsPage();

      // Step 2: Open the title
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedTableContent([{ status: RECEIVING_PIECE_STATUSES.CLAIM_SENT }]);

      // Step 3: Open the piece, create new holdings for a different location
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.clickCreateNewholdingsForLocation();
      SelectLocationModal.selectLocation(location2.name);
      EditPieceModal.verifySelectedLocation(location2.name);

      // Step 4: Check "Display on holding" checkbox
      EditPieceModal.checkDisplayOnHoldingCheckbox();
      EditPieceModal.verifyCheckboxState(DISPLAY_ON_HOLDING, true);

      // Steps 5-6: Open "Send claim" modal, specify a date in the next year
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSendClaimButton();
      SendClaimModal.verifyModalView();
      SendClaimModal.fillClaimExpiryDate(claimExpiryDates.nextYear);

      // Step 7: Cancel sending the claim, changes made in the piece are kept
      SendClaimModal.clickCancelButton();
      EditPieceModal.waitLoading();
      EditPieceModal.verifySelectedLocation(location2.name);
      EditPieceModal.verifyCheckboxState(DISPLAY_ON_HOLDING, true);

      // Steps 8-9: Open "Send claim" modal again, specify today's date and an external note
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSendClaimButton();
      SendClaimModal.verifyModalView();
      SendClaimModal.fillClaimExpiryDate(claimExpiryDates.today);
      SendClaimModal.fillExternalNote(externalNote);

      // Step 10: Today's date is not allowed
      SendClaimModal.clickSaveAndCloseButton({ closed: false });
      SendClaimModal.checkClaimExpiryDateError(ReceivingStates.dateMustBeLaterThanCurrentDate);

      // Step 11: Specify tomorrow's date
      SendClaimModal.fillClaimExpiryDate(claimExpiryDates.tomorrow);
      SendClaimModal.checkClaimExpiryDateHasNoError();

      // Steps 12-13: Send the claim, keep the holding which will no longer contain pieces or items
      SendClaimModal.clickSaveAndCloseButton();
      DeleteHoldingsModalReceivingFullScreen.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.KEEP_HOLDINGS,
      });
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      ReceivingDetails.checkExpectedTableContent([
        { status: RECEIVING_PIECE_STATUSES.CLAIM_SENT, holdingsLocation: location2.name },
      ]);

      // Step 14: Open the piece, the external note is saved
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: EXTERNAL_NOTE, conditions: { value: externalNote } },
      ]);

      // Step 15: Expand "Status log" accordion
      EditPieceModal.expandAccordion(RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.STATUS_LOG);
      const statusLogDate = formatDate(testData.locale, new Date());

      EditPieceModal.checkStatusLogContent([
        {
          status: RECEIVING_PIECE_STATUSES.CLAIM_SENT,
          date: statusLogDate,
          interval: '1',
          updatedBy: getUserName(testData.user),
        },
        {
          status: RECEIVING_PIECE_STATUSES.CLAIM_SENT,
          date: statusLogDate,
          interval: '5',
          updatedBy: getUserName(testData.adminUser),
        },
        {
          status: RECEIVING_PIECE_STATUSES.EXPECTED,
          date: statusLogDate,
          interval: NO_VALUE,
          updatedBy: getUserName(testData.adminUser),
        },
      ]);

      // Step 16: Quick receive the piece
      Receiving.quickReceiveInEditPieceModal();
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 17: Check receipt status of the PO line
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.FULLY_RECEIVED },
        ],
      });

      // Step 18: Go back to "Receiving" app, open the received piece and expand "Actions" menu
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      Receiving.selectRecordInReceivedList();
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.verifyActionsMenuOptionsStates([
        { option: RECEIVING_PIECE_FORM_ACTIONS_LABELS.SAVE_AND_CREATE, disabled: false },
        { option: RECEIVING_PIECE_FORM_ACTIONS_LABELS.UNRECEIVE, disabled: false },
        { option: RECEIVING_PIECE_FORM_ACTIONS_LABELS.DELETE, disabled: false },
      ]);

      // Step 19: Unreceive the piece
      EditPieceModal.clickUnreceiveButton();
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedTableContent([{ status: RECEIVING_PIECE_STATUSES.EXPECTED }]);
      ReceivingDetails.verifyReceivedRecordsCount(0);

      // Step 20: Check receipt status of the PO line
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
            value: RECEIPT_STATUS_VIEW.AWAITING_RECEIPT,
          },
        ],
      });

      // Step 21: Open the instance with two holdings, the new one contains the item
      OrderLineDetails.openInventoryItem();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(2);
      InstanceRecordView.verifyItemsListIsEmpty(location1.name);
      InventoryInstance.verifyNumberOfItemsInHoldingByName(location2.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: location2.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });
      InventoryInstance.checkAcquisitionsDetails([
        { receiptStatus: RECEIPT_STATUS_VIEW.AWAITING_RECEIPT },
      ]);
    },
  );
});
