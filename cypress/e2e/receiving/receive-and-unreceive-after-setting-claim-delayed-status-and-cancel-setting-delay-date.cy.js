import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  NO_VALUE,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  RECEIVING_PIECE_FORM_ACCORDIONS_LABELS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import DelayClaimModal from '../../support/fragments/receiving/modals/delayClaimModal';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import { formatDate } from '../../support/utils/acquisitions';
import DateTools from '../../support/utils/dateTools';
import InteractorsTools from '../../support/utils/interactorsTools';

// Day 15 of the previous month is always in the past and is not repeated among other months days
const PAST_CALENDAR_DAY = '15';

const today = new Date();
const dayAfterTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
const delayDates = {
  yesterday: DateTools.getPreviousDayDate(),
  nextWeek: DateTools.getFormattedDate({ date: DateTools.getFutureWeekDateObj() }, 'MM/DD/YYYY'),
  dayAfterTomorrow: DateTools.getFormattedDate({ date: dayAfterTomorrow }, 'MM/DD/YYYY'),
};

const getUserName = ({ personal }) => `${personal.lastName}, ${personal.firstName}`;

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    servicePoint: {},
    location: {},
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

  const createLocation = () => {
    return ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
      testData.servicePoint = servicePoint;

      const { location } = Locations.getDefaultLocation({ servicePointId: servicePoint.id });

      return Locations.createViaApi(location).then(() => {
        testData.location = location;
      });
    });
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

  const createOrderWithClaimingOrderLine = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
          claimingActive: true,
          claimingInterval: 5,
        });
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
        Permissions.inventoryAll.gui,
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
      .then(createLocation)
      .then(fetchReferenceData)
      .then(createOrderWithClaimingOrderLine)
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
    Locations.deleteViaApi(testData.location);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C423981 Receive and unreceive action after setting "Claim delayed" status to a Piece and cancel setting delay date (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C423981'] },
    () => {
      // Step 1: Open the title
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 2: Open the piece in "Expected" accordion
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();

      // Steps 3-4: Open "Delay claim" modal, specify a date in future
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDelayClaimButton();
      DelayClaimModal.verifyModalView();
      DelayClaimModal.fillDelayToDate(delayDates.nextWeek);

      // Step 5: Cancel setting the delay date
      DelayClaimModal.clickCancelButton();
      EditPieceModal.waitLoading();

      // Step 6: Open "Delay claim" modal again
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDelayClaimButton();
      DelayClaimModal.verifyModalView();
      DelayClaimModal.checkDelayToDateIsEmpty();

      // Step 7: The delay date is required
      DelayClaimModal.clickSaveAndCloseButton({ closed: false });
      DelayClaimModal.checkDelayToDateError(ReceivingStates.requiredFieldError);

      // Step 8: Open the calendar, past days and today are inactive
      DelayClaimModal.openCalendar();
      DelayClaimModal.verifyCalendarActiveDaysStartFromTomorrow();

      // Steps 9-10: All days of the previous month are inactive and can not be selected
      DelayClaimModal.clickCalendarPreviousMonth();
      DelayClaimModal.verifyCalendarDaysAreInactive();
      DelayClaimModal.clickCalendarDay(PAST_CALENDAR_DAY);
      DelayClaimModal.checkDelayToDateIsEmpty();

      // Step 11: All days of the previous month of the next year are active
      DelayClaimModal.clickCalendarNextYear();
      DelayClaimModal.verifyCalendarDaysAreActive();

      // Step 12: Close the calendar without selecting a date
      DelayClaimModal.closeCalendar();
      DelayClaimModal.checkDelayToDateIsEmpty();

      // Steps 13-14: A date in past is not allowed
      DelayClaimModal.fillDelayToDate(delayDates.yesterday);
      DelayClaimModal.clickSaveAndCloseButton({ closed: false });
      DelayClaimModal.checkDelayToDateError(ReceivingStates.dateMustBeLaterThanCurrentDate);

      // Step 15: Clear the delay date
      DelayClaimModal.clearDelayToDate();
      DelayClaimModal.checkDelayToDateError(ReceivingStates.requiredFieldError);

      // Steps 16-17: Delay the claim to the day after tomorrow
      DelayClaimModal.fillDelayToDate(delayDates.dayAfterTomorrow);
      DelayClaimModal.clickSaveAndCloseButton();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      ReceivingDetails.checkExpectedTableContent([
        { status: RECEIVING_PIECE_STATUSES.CLAIM_DELAYED },
      ]);

      // Step 18: Open the piece and expand "Status log" accordion
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.expandAccordion(RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.STATUS_LOG);
      const statusLogDate = formatDate(testData.locale, new Date());

      EditPieceModal.checkStatusLogContent([
        {
          status: RECEIVING_PIECE_STATUSES.CLAIM_DELAYED,
          date: statusLogDate,
          interval: '2',
          updatedBy: getUserName(testData.user),
        },
        {
          status: RECEIVING_PIECE_STATUSES.EXPECTED,
          date: statusLogDate,
          interval: NO_VALUE,
          updatedBy: getUserName(testData.adminUser),
        },
      ]);

      // Step 19: Quick receive the piece
      Receiving.quickReceiveInEditPieceModal();
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 20: Check receipt status of the PO line
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.ONGOING },
        ],
      });

      // Step 21: Go back to "Receiving" app, unreceive the piece
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      Receiving.selectRecordInReceivedList();
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickUnreceiveButton();
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedTableContent([{ status: RECEIVING_PIECE_STATUSES.EXPECTED }]);
      ReceivingDetails.verifyReceivedRecordsCount(0);

      // Step 22: Check receipt status of the PO line
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.ONGOING },
        ],
      });

      // Step 23: Open the instance with one holding and one item
      OrderLineDetails.openInventoryItem();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });
      InventoryInstance.checkAcquisitionsDetails([{ receiptStatus: RECEIPT_STATUS_VIEW.ONGOING }]);
    },
  );
});
