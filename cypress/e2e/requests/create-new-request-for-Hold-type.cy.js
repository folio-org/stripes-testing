import { TestTypes, DevTeams, Permissions } from '../../support/dictionary';
import { ITEM_STATUS_NAMES, REQUEST_TYPES, REQUEST_LEVELS } from '../../support/constants';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Requests from '../../support/fragments/requests/requests';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestsSearchResultsPane from '../../support/fragments/requests/requestsSearchResultsPane';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import RequestDetail from '../../support/fragments/requests/requestDetail';

describe('Request', () => {
  let userData = {};
  let requestId;
  let itemBarcode;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({
      count: 1,
      status: ITEM_STATUS_NAMES.CHECKED_OUT,
    }),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  before('Preconditions:', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Location.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });

    cy.createTempUser([
      Permissions.requestsAll.gui,
      Permissions.inventoryAll.gui,
      Permissions.usersViewRequests.gui,
      Permissions.uiUsersView.gui,
    ]).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointsViaApi(
        [testData.servicePoint.id],
        userData.userId,
        testData.servicePoint.id,
      );
      itemBarcode = testData.folioInstances[0].barcodes[0];
      cy.login(userData.username, userData.password, {
        path: TopMenu.requestsPath,
        waiter: RequestsSearchResultsPane.waitLoading,
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode,
      servicePointId: testData.servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    Requests.deleteRequestViaApi(requestId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
      testData.folioInstances[0].barcodes[0],
    );
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C545 Create new request for "Hold" type and check links to/from user and item (vega) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      // Create new request with item barcode and requester barcode
      NewRequest.openNewRequestPane();
      NewRequest.enterItemInfo(itemBarcode);
      NewRequest.verifyItemInformation([userData.barcode, ITEM_STATUS_NAMES.CHECKED_OUT]);
      NewRequest.enterRequesterBarcode(userData.barcode);
      NewRequest.verifyRequesterInformation(userData.username, userData.barcode);
      // ONLY "Hold" and "Recall" request types are displayed in Request types select
      NewRequest.verifyRequestTypeHasOptions(REQUEST_TYPES.HOLD, REQUEST_TYPES.RECALL);
      // Select "Hold" request type
      NewRequest.chooseRequestType(REQUEST_TYPES.HOLD);
      NewRequest.choosepickupServicePoint(testData.servicePoint.name);
      NewRequest.saveRequestAndClose();
      cy.intercept('POST', 'circulation/requests').as('createRequest');
      cy.wait('@createRequest').then((intercept) => {
        requestId = intercept.response.body.id;
        // Request is created
        cy.location('pathname').should('eq', `/requests/view/${requestId}`);
      });
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.HOLD,
        status: 'Open - Not yet filled',
        level: REQUEST_LEVELS.ITEM,
      });
    },
  );
});
