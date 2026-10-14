import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import DateTools from '../../support/utils/dateTools';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import Permissions from '../../support/dictionary/permissions';
import SendClaimModal from '../../support/fragments/receiving/modals/sendClaimModal';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

// Day 15 of the previous month is always in the past and is not repeated among other months days
const PAST_CALENDAR_DAY = '15';

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
            specialLocationId: testData.location.id,
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
      .then(createLocation)
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
    Locations.deleteViaApi(testData.location);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C423993 Verify that only future date can be selected in "Send claim" modal while setting "Claim sent" status to a Piece (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C423993'] },
    () => {
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

      // Step 4: Open the piece in "Expected" accordion
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();

      // Step 5: Open "Send claim" modal
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSendClaimButton();
      SendClaimModal.verifyModalView();

      // Step 6: The claim expiry date is required
      SendClaimModal.clickSaveAndCloseButton({ closed: false });
      SendClaimModal.checkClaimExpiryDateError(ReceivingStates.requiredFieldError);

      // Step 7: Open the calendar, past days and today are inactive
      SendClaimModal.openCalendar();
      SendClaimModal.verifyCalendarActiveDaysStartFromTomorrow();

      // Steps 8-9: All days of the previous month are inactive and can not be selected
      SendClaimModal.clickCalendarPreviousMonth();
      SendClaimModal.verifyCalendarDaysAreInactive();
      SendClaimModal.clickCalendarDay(PAST_CALENDAR_DAY);
      SendClaimModal.checkClaimExpiryDateIsEmpty();

      // Step 10: All days of the previous month of the next year are active
      SendClaimModal.clickCalendarNextYear();
      SendClaimModal.verifyCalendarDaysAreActive();

      // Step 11: Close the calendar without selecting a date
      SendClaimModal.closeCalendar();
      SendClaimModal.checkClaimExpiryDateIsEmpty();

      // Steps 12-13: A date in past is not allowed
      SendClaimModal.fillClaimExpiryDate(DateTools.getPreviousDayDate());
      SendClaimModal.clickSaveAndCloseButton({ closed: false });
      SendClaimModal.checkClaimExpiryDateError(ReceivingStates.dateMustBeLaterThanCurrentDate);

      // Step 14: Clear the claim expiry date
      SendClaimModal.clearClaimExpiryDate();
      SendClaimModal.checkClaimExpiryDateError(ReceivingStates.requiredFieldError);
    },
  );
});
