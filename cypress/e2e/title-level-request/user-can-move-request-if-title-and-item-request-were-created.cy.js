import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import MoveRequest from '../../support/fragments/requests/move-request';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

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
      cy.createTempUser([Permissions.uiRequestsAll.gui], patronGroup.name).then(
        (userProperties) => {
          testData.userForTLR = userProperties;
          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            testData.userForTLR.userId,
            testData.servicePoint.id,
          );
        },
      );

      cy.createTempUser([Permissions.uiRequestsAll.gui], patronGroup.name).then(
        (userProperties) => {
          testData.user = userProperties;
          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            testData.user.userId,
            testData.servicePoint.id,
          );
          TitleLevelRequests.enableTLRViaApi();
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
          cy.login(testData.user.username, testData.user.password);
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
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
    });

    it(
      'C350521 Check that user can move request if Title and Item requests were previously created (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C350521'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.visit(TopMenu.requestsPath);
          Requests.waitLoading();
        });

        Requests.findCreatedRequest(testData.user.barcode);
        Requests.selectFirstRequest(instanceData.instanceTitle);
        RequestDetail.waitLoading();
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

    it(
      'C350427 Check that the request has disappeared from the queue after changing the "Close-Cancelled" status (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C350427'] },
      () => {
        cy.visit(TopMenu.requestsPath);
        Requests.waitLoading();

        Requests.findCreatedRequest(testData.user.barcode);
        Requests.selectFirstRequest(instanceData.instanceTitle);
        RequestDetail.waitLoading();
        // Pay attention on the Request status and Item status
        RequestDetail.checkRequestInformation({
          status: 'Open - Not yet filled',
        });
        RequestDetail.checkItemStatus('Paged');
        // Click On the Action button
        RequestDetail.verifyActionsAvailableOptions();
        // Click on the Cancel request
        RequestDetail.openCancelRequestForm();
        RequestDetail.verifyCancelRequestModalDisplayed();
        // Cancel request
        RequestDetail.selectCancellationReason('Other');
        RequestDetail.provideAdditionalInformationForCancelation('Other reason');
        RequestDetail.confirmCancellation();
        RequestDetail.checkRequestStatus('Closed - Cancelled');
        // Open other request (request for the same instance)
        cy.visit(TopMenu.requestsPath);
        Requests.waitLoading();
        Requests.findCreatedRequest(testData.userForTLR.barcode);
        Requests.selectFirstRequest(instanceData.instanceTitle);
        RequestDetail.waitLoading();
        // Click on the Action button
        RequestDetail.openActions();
        // Select Request queue
        RequestDetail.viewRequestsInQueue();
        Requests.waitLoading();
        // Pay attention on the requests
        Requests.verifyRequestIsAbsent(testData.user.barcode);
      },
    );
  });
});
