import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { InventoryInstances } from '../../support/fragments/inventory';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import { ServicePoints } from '../../support/fragments/settings/tenant';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Title Level Request', () => {
  const requestIds = [];
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({
      itemsCount: 2,
    }),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  let instanceData;
  let holdRequests;
  let requestPosition;
  let lastRequestPosition;

  before(() => {
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
    });
    Requests.getRequestApi({ query: '(requestLevel=="Title")' }).then((requestResponse) => {
      requestResponse.forEach((response) => Requests.deleteRequestViaApi(response.id));
    });
    cy.createTempUser([Permissions.uiRequestsAll.gui]).then((userProperties) => {
      testData.userForTLR = userProperties;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        testData.userForTLR.userId,
        testData.servicePoint.id,
      );
    });
    cy.createTempUser([Permissions.uiRequestsAll.gui]).then((userProperties) => {
      testData.userForItemLevelRequest = userProperties;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        testData.userForItemLevelRequest.userId,
        testData.servicePoint.id,
      );
    });
    cy.createTempUser([Permissions.uiRequestsAll.gui]).then((userProperties) => {
      testData.userForTLR2 = userProperties;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        testData.userForTLR2.userId,
        testData.servicePoint.id,
      );
    });
    cy.createTempUser([Permissions.uiRequestsAll.gui]).then((userProperties) => {
      testData.user = userProperties;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        testData.user.userId,
        testData.servicePoint.id,
      );
    });
    return cy.wrap(null).then(() => {
      instanceData = testData.folioInstances[0];
      TitleLevelRequests.enableTLRViaApi();
      return Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        holdingsRecordId: testData.holdingTypeId,
        instanceId: instanceData.instanceId,
        item: { barcode: instanceData.barcodes[0] },
        itemId: instanceData.itemIds[0],
        pickupServicePointId: testData.servicePoint.id,
        requestDate: new Date(),
        requestLevel: REQUEST_LEVELS.ITEM,
        requestType: REQUEST_TYPES.PAGE,
        requesterId: testData.userForItemLevelRequest.userId,
      })
        .then((request1) => {
          requestIds.push(request1.body.id);
          return Requests.createNewRequestViaApi({
            fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
            holdingsRecordId: testData.holdingTypeId,
            instanceId: instanceData.instanceId,
            item: { barcode: instanceData.barcodes[0] },
            itemId: instanceData.itemIds[0],
            pickupServicePointId: testData.servicePoint.id,
            requestDate: new Date(),
            requestLevel: REQUEST_LEVELS.ITEM,
            requestType: REQUEST_TYPES.HOLD,
            requesterId: testData.user.userId,
          });
        })
        .then((request2) => {
          requestIds.push(request2.body.id);
          return Requests.createNewRequestViaApi({
            fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
            holdingsRecordId: testData.holdingTypeId,
            instanceId: instanceData.instanceId,
            item: { barcode: instanceData.barcodes[0] },
            itemId: instanceData.itemIds[0],
            pickupServicePointId: testData.servicePoint.id,
            requestDate: new Date(),
            requestLevel: REQUEST_LEVELS.ITEM,
            requestType: REQUEST_TYPES.HOLD,
            requesterId: testData.userForTLR2.userId,
          });
        })
        .then((request3) => {
          requestIds.push(request3.body.id);
          return Requests.createNewRequestViaApi({
            fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
            instanceId: instanceData.instanceId,
            item: { barcode: instanceData.barcodes[0] },
            pickupServicePointId: testData.servicePoint.id,
            requestDate: new Date(),
            requestLevel: REQUEST_LEVELS.TITLE,
            requestType: REQUEST_TYPES.PAGE,
            requesterId: testData.userForTLR.userId,
          });
        })
        .then((request4) => {
          requestIds.push(request4.body.id);
          return cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.requestsPath,
            waiter: Requests.waitLoading,
          });
        })
        .then(() => {
          return Requests.getRequestApi({
            query: `(instance.title=="${instanceData.instanceTitle}")`,
          });
        })
        .then((requestResponse) => {
          lastRequestPosition = requestResponse[3].position;
          holdRequests = requestResponse.filter(
            (request) => request.requestLevel === REQUEST_LEVELS.ITEM &&
              request.requestType === REQUEST_TYPES.HOLD,
          ).length;
          requestPosition = requestResponse.filter(
            (request) => request.requestLevel === REQUEST_LEVELS.ITEM &&
              request.requestType === REQUEST_TYPES.PAGE,
          )[0].position;
        });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    cy.wrap(requestIds).each((id) => {
      Requests.deleteRequestViaApi(id);
    });
    UserEdit.changeServicePointPreferenceViaApi(testData.userForTLR.userId, [
      testData.servicePoint.id,
    ]);
    UserEdit.changeServicePointPreferenceViaApi(testData.userForTLR2.userId, [
      testData.servicePoint.id,
    ]);
    UserEdit.changeServicePointPreferenceViaApi(testData.userForItemLevelRequest.userId, [
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
    Users.deleteViaApi(testData.userForTLR2.userId);
    Users.deleteViaApi(testData.userForItemLevelRequest.userId);
    Users.deleteViaApi(testData.user.userId);
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C350557 Check that the user directed to Request queue with correct number of requests displayed (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C350557'] },
    () => {
      // From the Request detail page of last request, look at the Position in queue field
      Requests.findCreatedRequest(instanceData.instanceTitle);
      Requests.selectFirstRequest(instanceData.instanceTitle);
      RequestDetail.waitLoading();
      RequestDetail.verifyPositionInQueue(`${requestPosition} (${holdRequests} requests)`);
      // Click on the position in queue link
      RequestDetail.viewRequestsInQueue();

      // From this Request queue, select the Request placed most recently
      Requests.selectRequest(instanceData.instanceTitle, 3);

      RequestDetail.waitLoading();
      RequestDetail.verifyPositionInQueue(`${lastRequestPosition} (${holdRequests} requests)`);
      // From the Action menu, select Reorder queue
      RequestDetail.requestQueueOnInstance(instanceData.instanceTitle);
      RequestDetail.checkRequestMovedToFulfillmentInProgress(
        testData.userForItemLevelRequest.barcode,
      );
      RequestDetail.checkRequestMovedToFulfillmentInProgress(testData.userForTLR.barcode, {
        rowIndex: 1,
        moved: true,
      });
      RequestDetail.checkRequestIsNotYetFilled(testData.user.barcode);
      RequestDetail.checkRequestIsNotYetFilled(testData.userForTLR2.barcode);
    },
  );
});
