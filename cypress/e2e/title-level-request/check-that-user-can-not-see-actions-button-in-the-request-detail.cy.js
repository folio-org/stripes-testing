import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Permissions from '../../support/dictionary/permissions';
import Requests from '../../support/fragments/requests/requests';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Title level Request', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  let firstItem;

  before('Preconditions', () => {
    cy.getAdminToken();
    cy.loginAsAdmin({
      path: SettingsMenu.circulationTitleLevelRequestsPath,
      waiter: TitleLevelRequests.waitLoading,
    });
    TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Locations.getDefaultLocation({
      servicePointId: testData.servicePoint.id,
    }).location;
    Locations.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
      firstItem = testData.folioInstances[0];
    });
    Requests.getRequestApi({ query: '(requestLevel=="Title")' }).then((requestResponse) => {
      requestResponse.forEach((response) => Requests.deleteRequestViaApi(response.id));
    });

    cy.createTempUser([Permissions.requestsAll.gui]).then((userProperties) => {
      testData.user = userProperties;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        testData.user.userId,
        testData.servicePoint.id,
      );
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        instanceId: firstItem.instanceId,
        pickupServicePointId: testData.servicePoint.id,
        requestDate: new Date(),
        requestLevel: REQUEST_LEVELS.TITLE,
        requestType: REQUEST_TYPES.PAGE,
        requesterId: testData.user.userId,
      }).then((request) => {
        testData.titleLevelRequestId = request.body.id;
      });

      cy.visit(TopMenu.requestsPath);
      Requests.findCreatedRequest(testData.user.barcode);
      Requests.selectFirstRequest(firstItem.instanceTitle);
      RequestDetail.waitLoading();
      Requests.cancelRequest();
      Requests.checkRequestStatus('Closed - Cancelled');

      cy.visit(SettingsMenu.circulationTitleLevelRequestsPath);
      TitleLevelRequests.changeTitleLevelRequestsStatus('forbid');
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.requestsPath,
        waiter: Requests.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(testData.titleLevelRequestId);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: firstItem,
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C350530 Check that user can not see Actions button in the Request detail if all request closed and Title level request option closed (vega) (TaaS)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      // Open Request detail page for Title level request
      Requests.findCreatedRequest(testData.user.barcode);
      Requests.selectFirstRequest(firstItem.instanceTitle);
      RequestDetail.waitLoading();
      // "Actions" dropdown  hidden
      Requests.checkActionDropdownHidden();
    },
  );
});
