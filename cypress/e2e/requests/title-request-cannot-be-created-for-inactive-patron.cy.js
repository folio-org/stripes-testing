import { ITEM_STATUS_NAMES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import generateItemBarcode from '../../support/utils/generateItemBarcode';

describe('Title level request cannot be created for inactive patron', () => {
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  let patronUser; // Inactive patron user
  let staffUser; // Active staff user who performs the test
  let requestId;
  const itemBarcodes = {
    item1: generateItemBarcode(),
    item2: generateItemBarcode(),
  };
  const folioInstances = InventoryInstances.generateFolioInstances({
    count: 2,
    itemsProperties: [
      { barcode: itemBarcodes.item1, status: { name: ITEM_STATUS_NAMES.AVAILABLE } },
      { barcode: itemBarcodes.item2, status: { name: ITEM_STATUS_NAMES.CHECKED_OUT } },
    ],
  });

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.userServicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
    Location.createViaApi(testData.defaultLocation)
      .then(() => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances,
          location: testData.defaultLocation,
        });
      })
      .then(() => {
        // Get HRIDs for instances
        cy.getInstanceById(folioInstances[0].instanceId).then((instance) => {
          folioInstances[0].instanceHRID = instance.hrid;
        });
        cy.getInstanceById(folioInstances[1].instanceId).then((instance) => {
          folioInstances[1].instanceHRID = instance.hrid;
        });
      });

    // Enable title level requests
    TitleLevelRequests.enableTLRViaApi();

    // Create inactive patron user
    cy.createTempUser([]).then((userProperties) => {
      patronUser = userProperties;

      // Make patron user inactive
      cy.getUsers({ limit: 1, query: `"id"="${patronUser.userId}"` }).then((users) => {
        const user = users[0];
        user.active = false;
        cy.updateUser(user);
      });
    });

    // Create active staff user with assigned service point
    cy.createTempUser([Permissions.uiRequestsCreate.gui, Permissions.uiUsersEdit.gui]).then(
      (userProperties) => {
        staffUser = userProperties;

        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          staffUser.userId,
          testData.userServicePoint.id,
        );

        cy.login(staffUser.username, staffUser.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    if (requestId) {
      Requests.deleteRequestViaApi(requestId);
    }
    if (patronUser?.userId) {
      Users.deleteViaApi(patronUser.userId);
    }
    if (staffUser?.userId) {
      UserEdit.changeServicePointPreferenceViaApi(staffUser.userId, [testData.userServicePoint.id]);
      Users.deleteViaApi(staffUser.userId);
    }
    folioInstances.forEach((instance) => {
      if (instance?.instanceId) {
        InventoryInstances.deleteInstanceViaApi({
          instance: {
            instanceId: instance.instanceId,
            holdings: instance.holdings || [],
            items: instance.items || [],
          },
          servicePoint: testData.userServicePoint,
          shouldCheckIn: false,
        });
      }
    });
    if (testData.defaultLocation) {
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
    }
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
  });

  it(
    'C1385312 Title level request cannot be created for inactive patron (vega)',
    { tags: ['criticalPath', 'vega', 'C1385312'] },
    () => {
      // Step 1: Attempt to create Page title level request for inactive patron (Instance A)
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(true);
      NewRequest.enableTitleLevelRequest();
      NewRequest.enterHridInfo(folioInstances[0].instanceHRID, false);
      NewRequest.verifyItemInformation([folioInstances[0].instanceTitle]);
      NewRequest.enterRequesterBarcode(patronUser.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
      NewRequest.choosePickupServicePoint(testData.userServicePoint.name);
      NewRequest.saveRequestAndClose();

      // Verify error toast and modal appear
      NewRequest.verifyErrorMessage('This request was not placed successfully');
      NewRequest.verifyModal('Request not allowed', 'Inactive users cannot make requests');

      // Step 2: Close modal using "Close" button
      NewRequest.closeRequestNotAllowedModal();

      // Verify request was not created
      NewRequest.verifyNewRequestFormIsOpen();

      // Step 3: Search for request by Instance A title and patron barcode - verify no request exists
      NewRequest.clickCancel();
      Requests.waitLoading();
      Requests.findCreatedRequest(folioInstances[0].instanceTitle);
      Requests.verifyNoResultMessage('No results found for');
      Requests.resetAllFilters();
      Requests.findCreatedRequest(patronUser.barcode);
      Requests.verifyNoResultMessage('No results found for');

      // Step 4: Attempt to create Hold title level request for inactive patron (Instance B)
      Requests.resetAllFilters();
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(true);
      NewRequest.enableTitleLevelRequest();
      NewRequest.enterHridInfo(folioInstances[1].instanceHRID, false);
      NewRequest.verifyItemInformation([folioInstances[1].instanceTitle]);
      NewRequest.enterRequesterBarcode(patronUser.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.HOLD);
      NewRequest.choosePickupServicePoint(testData.userServicePoint.name);
      NewRequest.saveRequestAndClose();

      // Verify error toast and modal appear
      NewRequest.verifyErrorMessage('This request was not placed successfully');
      NewRequest.verifyModal('Request not allowed', 'Inactive users cannot make requests');

      // Step 5: Close modal using "X" button
      NewRequest.closeRequestNotAllowedModalWithXButton();

      // Verify request was not created
      NewRequest.verifyNewRequestFormIsOpen();

      // Step 6: Attempt to create Recall title level request for inactive patron (Instance B)
      NewRequest.enterHridInfo(folioInstances[1].instanceHRID, false);
      NewRequest.verifyItemInformation([folioInstances[1].instanceTitle]);
      NewRequest.enterRequesterBarcode(patronUser.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.RECALL);
      NewRequest.choosePickupServicePoint(testData.userServicePoint.name);
      NewRequest.saveRequestAndClose();

      // Verify error toast and modal appear
      NewRequest.verifyErrorMessage('This request was not placed successfully');
      NewRequest.verifyModal('Request not allowed', 'Inactive users cannot make requests');

      // Step 7: Close modal using "Close" button
      NewRequest.closeRequestNotAllowedModal();

      // Verify request was not created
      NewRequest.verifyNewRequestFormIsOpen();

      // Step 8: Verify no requests exist for patron
      NewRequest.clickCancel();
      Requests.waitLoading();
      Requests.findCreatedRequest(patronUser.barcode);
      Requests.verifyNoResultMessage('No results found for');

      // Step 9: Make patron user active
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(patronUser.username);
      UsersCard.waitLoading();
      UserEdit.openEdit();
      UserEdit.changeStatus('Active');
      UserEdit.saveAndClose();
      UsersCard.waitLoading();

      // Verify status changed to Active
      UsersCard.checkKeyValue('Status', 'Active');

      // Step 10: Create Page title level request for now-active patron (Instance A)
      cy.visit(TopMenu.requestsPath);
      Requests.waitLoading();
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(true);
      NewRequest.enableTitleLevelRequest();
      NewRequest.enterHridInfo(folioInstances[0].instanceHRID, false);
      NewRequest.verifyItemInformation([folioInstances[0].instanceTitle]);
      NewRequest.enterRequesterBarcode(patronUser.barcode);
      NewRequest.verifyRequesterInformation(patronUser.username, patronUser.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
      NewRequest.choosePickupServicePoint(testData.userServicePoint.name);
      NewRequest.saveRequestAndClose();
      cy.wait(2000);

      // Verify request created successfully
      NewRequest.verifyRequestSuccessfullyCreated(patronUser.username);
      RequestDetail.waitLoading();
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.PAGE,
        status: 'Open - Not yet filled',
        level: REQUEST_LEVELS.TITLE,
      });

      // Save request ID for cleanup
      cy.location('pathname').then((pathname) => {
        requestId = pathname.split('/').pop();
      });

      // Step 11: Verify exactly one request exists for patron
      cy.visit(TopMenu.requestsPath);
      Requests.waitLoading();
      Requests.findCreatedRequest(patronUser.barcode);
      cy.wait(2000);

      // Verify only one request exists
      Requests.verifyResultsCount(1);
      Requests.selectFirstRequest(folioInstances[0].instanceTitle);
      RequestDetail.waitLoading();
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.PAGE,
        status: 'Open - Not yet filled',
        level: REQUEST_LEVELS.TITLE,
      });
      RequestDetail.checkTitleInformation({
        TLRs: '1',
        title: folioInstances[0].instanceTitle,
      });
    },
  );
});
