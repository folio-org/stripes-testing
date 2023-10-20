import { TestTypes, DevTeams, Permissions } from '../../support/dictionary';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Requests from '../../support/fragments/requests/requests';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewRequest from '../../support/fragments/requests/newRequest';
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import RequestsSearchResultsPane from '../../support/fragments/requests/requestsSearchResultsPane';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';

describe('Circulation log', () => {
  let userData = {};
  let requestId;
  let itemBarcode;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ count: 1 }),
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
    OtherSettings.setOtherSettingsViaApi({ titleLevelRequestsFeatureEnabled: true });
    cy.createTempUser([
      Permissions.uiRequestsCreate.gui,
      Permissions.uiRequestsView.gui,
      Permissions.uiRequestsEdit.gui,
      Permissions.requestsAll.gui,
      Permissions.checkoutAll.gui,
      Permissions.circulationLogAll.gui,
    ]).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointsViaApi(
        [testData.servicePoint.id],
        userData.userId,
        testData.servicePoint.id,
      );
      itemBarcode = testData.folioInstances[0].barcodes[0];
    });
  });

  after('Deleting created entities', () => {
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
    'C360553 Verify that user barcodes shown in request actions (Volaris) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.volaris] },
    () => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.requestsPath,
        waiter: RequestsSearchResultsPane.waitLoading,
      });
      // Create new request with item barcode anf requester barcode
      cy.visit(TopMenu.requestsPath);
      NewRequest.openNewRequestPane();
      NewRequest.enterItemInfo(itemBarcode);
      NewRequest.verifyItemInformation([userData.barcode, ITEM_STATUS_NAMES.AVAILABLE]);
      NewRequest.enterRequesterBarcode(userData.barcode);
      NewRequest.verifyRequesterInformation(userData.username, userData.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
      NewRequest.choosepickupServicePoint(testData.servicePoint.name);
      NewRequest.saveRequestAndClose();
      cy.intercept('POST', 'circulation/requests').as('createRequest');
      cy.wait('@createRequest').then((intercept) => {
        requestId = intercept.response.body.id;
        cy.location('pathname').should('eq', `/requests/view/${requestId}`);
      });
      // Navigate to the "Check out" app and check out the Item (by requster barcode and item barcode)
      cy.visit(TopMenu.checkOutPath);
      CheckOutActions.checkOutItemUser(userData.barcode, itemBarcode);
      // Navigate to the "Circulation log" app and Search for item by barcode
      cy.visit(TopMenu.circulationLogPath);
      SearchPane.waitLoading();
      SearchPane.searchByItemBarcode(itemBarcode);
      // Observe search result table. The users barcode is displayed correctly in the "User barcode" column
      SearchPane.findResultRowIndexByContent(itemBarcode).then((rowIndex) => {
        SearchPane.checkResultSearch(userData.barcode, rowIndex);
      });
    },
  );
});
