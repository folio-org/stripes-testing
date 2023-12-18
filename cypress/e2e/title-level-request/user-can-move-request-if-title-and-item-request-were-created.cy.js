import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import getRandomPostfix from '../../support/utils/stringTools';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Permissions from '../../support/dictionary/permissions';
import MoveRequest from '../../support/fragments/requests/move-request';
import Requests from '../../support/fragments/requests/requests';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Title Level Request', () => {
  describe('Move request. TLR', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        itemsCount: 2,
      }),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const patronGroup = {
      name: 'groupTLR' + getRandomPostfix(),
    };
    let instanceData;
    const requestIds = [];

    before('Preconditions', () => {
      cy.getAdminToken();
      cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
        testData.holdingTypeId = holdingTypes[0].id;
      });
      cy.loginAsAdmin({
        path: SettingsMenu.circulationTitleLevelRequestsPath,
        waiter: TitleLevelRequests.waitLoading,
      });
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      }).location;
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
        instanceData = testData.folioInstances[0];
      });
      Requests.getRequestApi({ query: '(requestLevel=="Title")' }).then((requestResponse) => {
        requestResponse.forEach((response) => Requests.deleteRequestViaApi(response.id));
      });

      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.createTempUser([Permissions.requestsAll.gui], patronGroup.name).then((userProperties) => {
        testData.userForTLR = userProperties;
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          testData.userForTLR.userId,
          testData.servicePoint.id,
        );
      });

      cy.createTempUser([Permissions.requestsAll.gui], patronGroup.name).then((userProperties) => {
        testData.user = userProperties;
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          testData.user.userId,
          testData.servicePoint.id,
        );
        TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          holdingsRecordId: testData.holdingTypeId,
          instanceId: instanceData.instanceId,
          item: { barcode: instanceData.barcodes[0] },
          itemId: instanceData.itemIds[0],
          pickupServicePointId: testData.servicePoint.id,
          requestDate: new Date(),
          requestLevel: REQUEST_LEVELS.ITEM,
          requestType: REQUEST_TYPES.PAGE,
          requesterId: testData.user.userId,
        }).then((request) => {
          requestIds.push(request.body.id);
        });
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          instanceId: instanceData.instanceId,
          item: { barcode: instanceData.barcodes[1] },
          pickupServicePointId: testData.servicePoint.id,
          requestDate: new Date(),
          requestLevel: REQUEST_LEVELS.TITLE,
          requestType: REQUEST_TYPES.PAGE,
          requesterId: testData.userForTLR.userId,
        }).then((request) => {
          requestIds.push(request.body.id);
        });
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });
        Requests.findCreatedRequest(testData.user.barcode);
        Requests.selectFirstRequest(instanceData.instanceTitle);
        RequestDetail.waitLoading();
      });
    });

    after('Delete test data', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.circulationTitleLevelRequestsPath,
        waiter: TitleLevelRequests.waitLoading,
      });
      cy.wrap(requestIds).each((id) => {
        Requests.deleteRequestViaApi(id);
      });
      UserEdit.changeServicePointPreferenceViaApi(testData.userForTLR.userId, [
        testData.servicePoint.id,
      ]);
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      Users.deleteViaApi(testData.userForTLR.userId);
      Users.deleteViaApi(testData.user.userId);
      PatronGroups.deleteViaApi(patronGroup.id);
      Locations.deleteViaApi(testData.defaultLocation);
      TitleLevelRequests.changeTitleLevelRequestsStatus('forbid');
    });

    it(
      'C350521 Check that user can move request if Title and Item requests were previously created (vega) (TaaS)',
      { tags: ['extendedPath', 'vega'] },
      () => {
        // Click on the Actions option
        RequestDetail.openActions();
        RequestDetail.verifyMoveRequestButtonExists();
        // Click on the Move request option
        RequestDetail.openMoveRequest();
        MoveRequest.waitLoading();
        // Select item
        MoveRequest.chooseItem(instanceData.barcodes[1]);
        // "Hold" and "Recall" request types are available for selection
        MoveRequest.verifyRequestTypes('Hold', 'Recall');
      },
    );
  });
});
