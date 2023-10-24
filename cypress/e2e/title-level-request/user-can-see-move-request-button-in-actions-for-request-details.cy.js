import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Requests from '../../support/fragments/requests/requests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import SettingsMenu from '../../support/fragments/settingsMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import RequestDetail from '../../support/fragments/requests/requestDetail';

describe('Title Level Request', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    folioInstances: InventoryInstances.generateFolioInstances(),
  };
  let requestId;

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Location.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    cy.loginAsAdmin({
      path: SettingsMenu.circulationTitleLevelRequestsPath,
      waiter: TitleLevelRequests.waitLoading,
    });
    TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
    cy.createTempUser([Permissions.requestsAll.gui]).then((userProperties) => {
      testData.user = userProperties;
      UserEdit.addServicePointsViaApi(
        [testData.servicePoint.id],
        testData.user.userId,
        testData.servicePoint.id,
      );
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.requestsPath,
        waiter: Requests.waitLoading,
      });
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        instanceId: testData.folioInstances[0].instanceId,
        pickupServicePointId: testData.servicePoint.id,
        requestDate: new Date(),
        requestLevel: REQUEST_LEVELS.TITLE,
        requestType: REQUEST_TYPES.PAGE,
        requesterId: testData.user.userId,
      }).then((createdRequest) => {
        requestId = createdRequest.body.id;
      });
    });
  });

  after('Delete test data', () => {
    Requests.deleteRequestViaApi(requestId);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
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
    'C353975 Check that user can see Move request action in Action dropdown for request with connected item (vega) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      Requests.waitContentLoading();
      Requests.findCreatedRequest(testData.folioInstances[0].barcodes[0]);
      Requests.selectFirstRequest(testData.folioInstances[0].instanceTitle);
      RequestDetail.openActions();
      RequestDetail.verifyMoveRequestButtonExists();
    },
  );
});
