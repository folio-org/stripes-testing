import { ITEM_STATUS_NAMES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import generateItemBarcode from '../../support/utils/generateItemBarcode';

describe('Item level request cannot be created for inactive patron', () => {
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  let patronUser; // Inactive patron user
  let staffUser; // Active staff user who performs the test
  let requestId;
  const itemBarcodes = {
    item1: generateItemBarcode(),
    item2: generateItemBarcode(),
    item3: generateItemBarcode(),
  };
  const folioInstances = InventoryInstances.generateFolioInstances({
    count: 3,
    itemsProperties: [
      { barcode: itemBarcodes.item1, status: { name: ITEM_STATUS_NAMES.AVAILABLE } },
      { barcode: itemBarcodes.item2, status: { name: ITEM_STATUS_NAMES.CHECKED_OUT } },
      { barcode: itemBarcodes.item3, status: { name: ITEM_STATUS_NAMES.IN_TRANSIT } },
    ],
  });

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.userServicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
    Location.createViaApi(testData.defaultLocation).then(() => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances,
        location: testData.defaultLocation,
      });
    });

    // Create inactive patron user
    cy.createTempUser([]).then((userProperties) => {
      patronUser = userProperties;
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
    'C1385311 Item level request cannot be created for inactive patron (vega)',
    { tags: ['criticalPath', 'vega', 'C1385311'] },
    () => {
      // Step 1: Create request for active patron (Item 2 - Checked out)
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(true);
      NewRequest.unselectTitleLevelRequest();
      NewRequest.enterItemInfo(itemBarcodes.item2);
      NewRequest.verifyItemInformation([itemBarcodes.item2, ITEM_STATUS_NAMES.CHECKED_OUT]);
      NewRequest.enterRequesterBarcode(patronUser.barcode);
      NewRequest.verifyRequesterInformation(patronUser.username, patronUser.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.HOLD);
      NewRequest.choosePickupServicePoint(testData.userServicePoint.name);
      NewRequest.saveRequestAndClose();
      cy.wait(2000);

      // Verify request created successfully
      NewRequest.verifyRequestSuccessfullyCreated(patronUser.username);
      RequestDetail.waitLoading();
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.HOLD,
        status: 'Open - Not yet filled',
        level: REQUEST_LEVELS.ITEM,
      });

      // Save request ID for cleanup
      cy.location('pathname').then((pathname) => {
        requestId = pathname.split('/').pop();
      });

      // Step 2: Make user inactive
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(patronUser.username);
      UsersCard.waitLoading();
      UserEdit.openEdit();
      UserEdit.changeStatus('Inactive');
      UserEdit.saveAndClose();
      UsersCard.waitLoading();

      // Verify status changed to Inactive
      UsersCard.checkKeyValue('Status', 'Inactive');

      // Step 3: Attempt to create Page request for inactive patron (Item 1 - Available)
      cy.visit(TopMenu.requestsPath);
      Requests.waitLoading();
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(true);
      NewRequest.unselectTitleLevelRequest();
      NewRequest.enterItemInfo(itemBarcodes.item1);
      NewRequest.verifyItemInformation([itemBarcodes.item1, ITEM_STATUS_NAMES.AVAILABLE]);
      NewRequest.enterRequesterBarcode(patronUser.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
      NewRequest.choosePickupServicePoint(testData.userServicePoint.name);
      NewRequest.saveRequestAndClose();

      // Verify error toast and modal appear
      NewRequest.verifyErrorMessage('This request was not placed successfully');
      NewRequest.verifyModal('Request not allowed', 'Inactive users cannot make requests');

      // Step 4: Close modal using "Close" button
      NewRequest.closeRequestNotAllowedModal();

      // Verify request was not created
      NewRequest.verifyNewRequestFormIsOpen();

      // Step 5: Search for request by Item 1 barcode - verify no request exists
      NewRequest.clickCancel();
      Requests.waitLoading();
      Requests.findCreatedRequest(itemBarcodes.item1);
      Requests.verifyNoResultMessage('No results found for');

      // Step 6: Attempt to create Hold request for inactive patron (Item 3 - In transit)
      Requests.resetAllFilters();
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(true);
      NewRequest.unselectTitleLevelRequest();
      NewRequest.enterItemInfo(itemBarcodes.item3);
      NewRequest.verifyItemInformation([itemBarcodes.item3, ITEM_STATUS_NAMES.IN_TRANSIT]);
      NewRequest.enterRequesterBarcode(patronUser.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.HOLD);
      NewRequest.choosePickupServicePoint(testData.userServicePoint.name);
      NewRequest.saveRequestAndClose();

      // Verify error toast and modal appear
      NewRequest.verifyErrorMessage('This request was not placed successfully');
      NewRequest.verifyModal('Request not allowed', 'Inactive users cannot make requests');

      // Step 7: Close modal using "X" button
      NewRequest.closeRequestNotAllowedModalWithXButton();

      // Verify request was not created
      NewRequest.verifyNewRequestFormIsOpen();

      // Step 8: Attempt to create Recall request for inactive patron (Item 3 - In transit)
      NewRequest.enterItemInfo(itemBarcodes.item3);
      NewRequest.verifyItemInformation([itemBarcodes.item3, ITEM_STATUS_NAMES.IN_TRANSIT]);
      NewRequest.enterRequesterBarcode(patronUser.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.RECALL);
      NewRequest.choosePickupServicePoint(testData.userServicePoint.name);
      NewRequest.saveRequestAndClose();

      // Verify error toast and modal appear
      NewRequest.verifyErrorMessage('This request was not placed successfully');
      NewRequest.verifyModal('Request not allowed', 'Inactive users cannot make requests');

      // Step 9: Close modal using "Close" button
      NewRequest.closeRequestNotAllowedModal();

      // Verify request was not created
      NewRequest.verifyNewRequestFormIsOpen();

      // Step 10: Verify only the request created before user became inactive exists
      NewRequest.clickCancel();
      Requests.waitLoading();
      Requests.findCreatedRequest(patronUser.barcode);
      cy.wait(2000);

      // Verify only one request exists (the one created in Step 1)
      Requests.verifyResultsCount(1);
      Requests.selectFirstRequest(folioInstances[1].instanceTitle);
      RequestDetail.waitLoading();
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.HOLD,
        status: 'Open - Not yet filled',
        level: REQUEST_LEVELS.ITEM,
      });
      RequestDetail.checkItemInformation({
        itemBarcode: itemBarcodes.item2,
        title: folioInstances[1].instanceTitle,
        effectiveLocation: testData.defaultLocation.name,
        itemStatus: ITEM_STATUS_NAMES.CHECKED_OUT,
        requestsOnItem: '1',
      });
    },
  );
});
