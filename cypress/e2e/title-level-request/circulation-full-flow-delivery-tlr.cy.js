import {
  APPLICATION_NAMES,
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import RouteForDeliveryRequest from '../../support/fragments/checkin/modals/routeForDeliveryRequest';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import LoansPage from '../../support/fragments/loans/loansPage';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Title Level Request', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({
      count: 1,
      itemsCount: 1,
    }),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const patronGroup = {
    name: getTestEntityValue('CircFlow'),
  };
  let patronUser; // Patron user who makes the request
  let staffUser; // Staff user who performs operations
  let instanceData;
  let requestId;

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        TitleLevelRequests.enableTLRViaApi();
        ServicePoints.createViaApi(testData.servicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
          patronGroup.id = patronGroupResponse;
        });
        cy.createLoanType({
          name: getTestEntityValue('DeliveryLoanType'),
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location: testData.defaultLocation,
          loanTypeId: testData.loanTypeId,
        });
      })
      .then(() => {
        instanceData = testData.folioInstances[0];
        cy.getInstanceById(instanceData.instanceId).then((instance) => {
          instanceData.instanceHRID = instance.hrid;
        });

        // Create patron user with delivery enabled
        cy.createTempUser([], patronGroup.name).then((userProperties) => {
          patronUser = userProperties;

          // Add address and enable delivery for patron
          cy.getUsers({ limit: 1, query: `id=="${patronUser.userId}"` }).then(([user]) => {
            const updatedUser = {
              ...user,
              personal: {
                ...user.personal,
                addresses: [
                  {
                    addressLine1: '123 Main St',
                    city: 'Test City',
                    region: 'Test Region',
                    postalCode: '12345',
                    addressTypeId: '93d3d88d-499b-45d0-9bc7-ac73c3a19880', // Home address type
                    primaryAddress: true,
                  },
                ],
              },
            };
            cy.updateUser(updatedUser);
          });

          // Update request preference to enable delivery
          cy.getRequestPreference({ query: `userId=="${patronUser.userId}"` }).then((response) => {
            const existing = response.body.requestPreferences[0];
            cy.updateRequestPreference(existing.id, {
              ...existing,
              delivery: true,
              defaultDeliveryAddressTypeId: '93d3d88d-499b-45d0-9bc7-ac73c3a19880',
              fulfillment: FULFILMENT_PREFERENCES.DELIVERY,
            });
          });
        });

        // Create staff user with assigned service point and permissions
        cy.createTempUser([
          Permissions.checkinAll.gui,
          Permissions.checkoutAll.gui,
          Permissions.circulationLogAll.gui,
          Permissions.uiRequestsAll.gui,
          Permissions.uiUsersViewLoans.gui,
          Permissions.uiUsersViewRequests.gui,
        ]).then((userProperties) => {
          staffUser = userProperties;
          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            staffUser.userId,
            testData.servicePoint.id,
          );

          cy.login(staffUser.username, staffUser.password);
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode: instanceData.barcodes[0],
      servicePointId: testData.servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    if (requestId) {
      Requests.deleteRequestViaApi(requestId);
    }
    if (patronUser) {
      Users.deleteViaApi(patronUser.userId);
    }
    if (staffUser) {
      UserEdit.changeServicePointPreferenceViaApi(staffUser.userId, [testData.servicePoint.id]);
      Users.deleteViaApi(staffUser.userId);
    }
    PatronGroups.deleteViaApi(patronGroup.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Location.deleteViaApi(testData.defaultLocation.id);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    cy.deleteLoanType(testData.loanTypeId);
  });

  it(
    'C1375896 Circulation full flow begins from creating delivery Title level Page request, check out, and return check in (vega)',
    { tags: ['criticalPath', 'vega', 'C1375896'] },
    () => {
      // Step 1: Create title level Page request with Delivery fulfillment preference
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage();
      NewRequest.enableTitleLevelRequest();
      NewRequest.enterHridInfo(instanceData.instanceHRID, false);
      NewRequest.enterRequesterBarcode(patronUser.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
      NewRequest.chooseFulfillmentPreference(FULFILMENT_PREFERENCES.DELIVERY);
      NewRequest.chooseDeliveryAddress('Home');

      NewRequest.saveRequestAndClose();
      cy.wait('@createRequest').then((intercept) => {
        requestId = intercept.response.body.id;
      });
      NewRequest.waitLoading();

      // Verify request was created successfully
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.PAGE,
        status: 'Open - Not yet filled',
        level: REQUEST_LEVELS.TITLE,
      });
      RequestDetail.checkItemStatus(ITEM_STATUS_NAMES.PAGED);

      // Step 2: Check in the requested item
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
      CheckInActions.waitLoading();
      CheckInActions.checkInItemGui(instanceData.barcodes[0]);

      // Step 3: Verify "Route for delivery request" popup and close it
      RouteForDeliveryRequest.verifyModalTitle();
      RouteForDeliveryRequest.closeModal();

      // Verify item appears in scanned items and status is "Awaiting delivery"
      CheckInActions.verifyLastCheckInItem(instanceData.barcodes[0]);
      CheckInActions.verifyLastCheckInItemStatus('Awaiting delivery');

      // Step 4: Open request details from check-in actions menu
      CheckInActions.openRequestDetails();
      RequestDetail.waitLoading();
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.PAGE,
        status: 'Open - Awaiting delivery',
        level: REQUEST_LEVELS.TITLE,
      });
      RequestDetail.checkItemStatus('Awaiting delivery');

      // Step 5: Check out the item to the patron
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
      Checkout.waitLoading();
      CheckOutActions.checkOutUser(patronUser.barcode);
      CheckOutActions.checkOutItem(instanceData.barcodes[0]);

      // Verify item was checked out successfully
      Checkout.verifyResultsInTheRow([instanceData.barcodes[0]]);

      // Step 6: Open loan details from checkout actions menu
      CheckOutActions.openLoanDetails();
      LoansPage.waitLoading();

      // Verify item status is "Checked out"
      LoansPage.checkItemStatus(ITEM_STATUS_NAMES.CHECKED_OUT);

      // Step 7: Close loan details and verify closed request
      LoansPage.closeLoanDetails();
      UsersCard.clickOnCloseIcon();

      // Expand Requests accordion on patron details pane
      UsersCard.expandRequestsSection('0', '1');

      // Click on closed requests hyperlink
      UsersCard.showClosedRequests();
      Requests.waitLoading();

      // Verify created request appears in closed requests with "Closed - Filled" status
      Requests.verifyRequestStatusInList('Closed - Filled');

      // Step 8: Return checked out item
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
      CheckInActions.waitLoading();

      CheckInActions.checkInItemGui(instanceData.barcodes[0]);

      // Verify item is checked in successfully and status is "Available"
      CheckInActions.verifyLastCheckInItem(instanceData.barcodes[0]);
      CheckInActions.verifyLastCheckInItemStatus(ITEM_STATUS_NAMES.AVAILABLE);

      // Step 9: Open loan details from check-in actions menu
      CheckInActions.openActions();
      CheckInActions.clickLoanDetailsOption();
      LoansPage.waitLoading();

      // Verify item status is "Available"
      LoansPage.checkItemStatus(ITEM_STATUS_NAMES.AVAILABLE);

      // Step 10: Close loan details and verify closed loans
      LoansPage.closeLoanDetails();

      // Verify list of loans appears with "Closed" toggle active
      LoansPage.verifyClosedLoansVisible();

      // Step 11: Go to Circulation log and search for item
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
      SearchPane.waitLoading();
      SearchPane.searchByItemBarcode(instanceData.barcodes[0]);

      // Verify all records appear in search results (request, loan, check-in related)
      SearchPane.verifyResult(instanceData.barcodes[0]);
      SearchPane.verifyMultipleResults(['request', 'loan', 'Checked out', 'Checked in']);
    },
  );
});
