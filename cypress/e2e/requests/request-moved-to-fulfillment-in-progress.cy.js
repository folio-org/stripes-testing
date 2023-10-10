import { TestTypes, DevTeams, Permissions } from '../../support/dictionary';
import {
  ITEM_STATUS_NAMES,
  REQUEST_TYPES,
  FULFILMENT_PREFERENCES,
  REQUEST_LEVELS,
} from '../../support/constants';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../support/utils/stringTools';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Requests from '../../support/fragments/requests/requests';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import InTransit from '../../support/fragments/checkin/modals/inTransit';

describe('Title Level Request. Request queue. TLR', () => {
  let userData = {};
  let requestId;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ count: 1 }),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    servicePoint2: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  const patronGroup = {
    name: 'groupTLR' + getRandomPostfix(),
  };

  before('Preconditions:', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    ServicePoints.createViaApi(testData.servicePoint2);
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
    cy.createTempUser(
      [
        Permissions.uiRequestsCreate.gui,
        Permissions.uiRequestsView.gui,
        Permissions.uiRequestsEdit.gui,
        Permissions.requestsAll.gui,
        Permissions.checkinAll.gui,
      ],
      patronGroup.name,
    ).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointsViaApi(
        [testData.servicePoint.id, testData.servicePoint2.id],
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
      });
      cy.login(userData.username, userData.password);
    });
  });

  after('Deleting created entities', () => {
    Requests.deleteRequestViaApi(requestId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [
      testData.servicePoint.id,
      testData.servicePoint2.id,
    ]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    ServicePoints.deleteViaApi(testData.servicePoint2.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
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
    'C350425 Check that request goes to "Fulfillment in progress" if the items status has changed to "In progress" (vega) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      SwitchServicePoint.switchServicePoint(testData.servicePoint2.name);
      SwitchServicePoint.checkIsServicePointSwitched(testData.servicePoint2.name);
      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.checkInItem(testData.folioInstances[0].barcodes[0]);
      InTransit.verifyModalTitle();
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInActions.endCheckInSessionAndCheckDetailsOfCheckInAreCleared();
      cy.visit(TopMenu.requestsPath);
      Requests.findCreatedRequest(testData.folioInstances[0].barcodes[0]);
      Requests.selectFirstRequest(testData.folioInstances[0].barcodes[0]);
      RequestDetail.checkItemInformation({
        itemBarcode: testData.folioInstances[0].barcodes[0],
        title: testData.folioInstances[0].instanceTitle,
        effectiveLocation: testData.defaultLocation.name,
        itemStatus: ITEM_STATUS_NAMES.IN_TRANSIT,
        requestsOnItem: '1',
      });
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.PAGE,
        status: 'Open - In transit',
        level: REQUEST_LEVELS.TITLE,
      });
      RequestDetail.requestQueueOnInstance(testData.folioInstances[0].instanceTitle);
      RequestDetail.checkRequestMovedToFulfillmentInProgress(
        testData.folioInstances[0].barcodes[0],
      );
    },
  );
});
