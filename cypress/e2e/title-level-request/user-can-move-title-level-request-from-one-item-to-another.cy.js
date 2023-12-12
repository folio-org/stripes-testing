import { TestTypes, DevTeams, Permissions } from '../../support/dictionary';
import { REQUEST_TYPES, FULFILMENT_PREFERENCES, REQUEST_LEVELS } from '../../support/constants';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../support/fragments/topMenu';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../support/utils/stringTools';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Requests from '../../support/fragments/requests/requests';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import MoveRequest from '../../support/fragments/requests/move-request';

describe('Title Level Request', () => {
  let userData = {};
  let requestId;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({
      barcodes: [generateUniqueItemBarcodeWithShift(1), generateUniqueItemBarcodeWithShift(2)],
    }),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const patronGroup = {
    name: 'groupTLR' + getRandomPostfix(),
  };

  before('Preconditions:', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    cy.loginAsAdmin({
      path: SettingsMenu.circulationTitleLevelRequestsPath,
      waiter: TitleLevelRequests.waitLoading,
    });
    TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
    testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Location.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    cy.createTempUser([Permissions.requestsAll.gui], patronGroup.name).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointsViaApi(
        [testData.servicePoint.id],
        userData.userId,
        testData.servicePoint.id,
      );
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        instanceId: testData.folioInstances[0].instanceId,
        pickupServicePointId: testData.servicePoint.id,
        requestDate: new Date(),
        requestLevel: REQUEST_LEVELS.TITLE,
        requestType: REQUEST_TYPES.PAGE,
        requesterId: userData.userId,
      }).then((createdRequest) => {
        requestId = createdRequest.body.id;
        testData.currentItem = createdRequest.body.item.barcode;
      });
      cy.login(userData.username, userData.password);
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(requestId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    testData.folioInstances.forEach((item) => {
      InventoryInstances.deleteInstanceViaApi({
        instance: item,
        servicePoint: testData.servicePoint,
      });
    });
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C353976: Check that user can move Title Level Request from one Item to another (vega)(TaaS)',
    { tags: ['criticalPath', 'vega'] },
    () => {
      testData.folioInstances.forEach((item) => {
        item.barcodes.forEach((barcode) => {
          if (barcode !== testData.currentItem) {
            cy.visit(TopMenu.requestsPath);
            Requests.waitLoading();
            Requests.selectTitleRequestLevel();
            Requests.findCreatedRequest(item.instanceTitle);
            Requests.selectFirstRequest(item.instanceTitle);
            RequestDetail.openActions();
            RequestDetail.openMoveRequest();
            MoveRequest.waitLoading();
            MoveRequest.chooseItem(barcode);
            MoveRequest.checkIsRequestMovedSuccessfully();
          }
        });
      });
    },
  );
});
