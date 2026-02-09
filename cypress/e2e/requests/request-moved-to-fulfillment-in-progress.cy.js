import {
  APPLICATION_NAMES,
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
  LOCATION_IDS,
  LOCATION_NAMES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Title Level Request', () => {
  let userData = {};
  let requestId;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ count: 1 }),
  };

  const patronGroup = {
    name: 'groupTLR' + getRandomPostfix(),
  };

  before('Preconditions:', () => {
    cy.getAdminToken();
    ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
      testData.servicePoint = servicePoint;
    });
    ServicePoints.getCircDesk2ServicePointViaApi().then((servicePoint2) => {
      testData.servicePoint2 = servicePoint2;
    });
    TitleLevelRequests.enableTLRViaApi();
    testData.defaultLocationId = LOCATION_IDS.MAIN_LIBRARY;
    const location = { id: testData.defaultLocationId };
    InventoryInstances.createFolioInstancesViaApi({
      folioInstances: testData.folioInstances,
      location,
    });
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    cy.createTempUser(
      [
        Permissions.uiRequestsCreate.gui,
        Permissions.uiRequestsView.gui,
        Permissions.uiRequestsEdit.gui,
        Permissions.uiRequestsAll.gui,
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

        cy.login(userData.username, userData.password, {
          path: TopMenu.checkInPath,
          waiter: CheckInActions.waitLoading,
          authRefresh: true,
        });
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(requestId);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
      testData.folioInstances[0].barcodes[0],
    );
  });

  it(
    'C350425 Check that request goes to "Fulfillment in progress" if the items status has changed to "In progress" (vega) (TaaS)',
    { tags: ['criticalPath', 'vega', 'C350425'] },
    () => {
      SwitchServicePoint.switchServicePoint(testData.servicePoint2.name);
      SwitchServicePoint.checkIsServicePointSwitched(testData.servicePoint2.name);
      CheckInActions.checkInItem(testData.folioInstances[0].barcodes[0]);
      InTransit.verifyModalTitle();
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInActions.endCheckInSessionAndCheckDetailsOfCheckInAreCleared();

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.findCreatedRequest(testData.folioInstances[0].barcodes[0]);
      Requests.selectFirstRequest(testData.folioInstances[0].instanceTitle);
      RequestDetail.checkItemInformation({
        itemBarcode: testData.folioInstances[0].barcodes[0],
        title: testData.folioInstances[0].instanceTitle,
        effectiveLocation: LOCATION_NAMES.MAIN_LIBRARY_UI,
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
