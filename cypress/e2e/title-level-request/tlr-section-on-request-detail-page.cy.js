import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { InventoryInstances } from '../../support/fragments/inventory';
import EditRequest from '../../support/fragments/requests/edit-request';
import NewRequest from '../../support/fragments/requests/newRequest';
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
      itemsCount: 4,
    }),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  let instanceData;

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
      instanceData = testData.folioInstances[0];
      cy.wait(3000);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"id"=="${instanceData.instanceId}"`,
      }).then((instance) => {
        testData.instanceHRID = instance.hrid;
      });
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
        requesterId: testData.userForItemLevelRequest.userId,
      }).then((request) => {
        requestIds.push(request.body.id);
      });
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        holdingsRecordId: testData.holdingTypeId,
        instanceId: instanceData.instanceId,
        item: { barcode: instanceData.barcodes[1] },
        itemId: instanceData.itemIds[1],
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
        item: { barcode: instanceData.barcodes[2] },
        pickupServicePointId: testData.servicePoint.id,
        requestDate: new Date(),
        requestLevel: REQUEST_LEVELS.TITLE,
        requestType: REQUEST_TYPES.PAGE,
        requesterId: testData.userForTLR.userId,
      }).then((request) => {
        requestIds.push(request.body.id);
      });
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        instanceId: instanceData.instanceId,
        item: { barcode: instanceData.barcodes[3] },
        pickupServicePointId: testData.servicePoint.id,
        requestDate: new Date(),
        requestLevel: REQUEST_LEVELS.TITLE,
        requestType: REQUEST_TYPES.PAGE,
        requesterId: testData.userForTLR2.userId,
      }).then((request) => {
        requestIds.push(request.body.id);
      });
      cy.waitForAuthRefresh(() => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });
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
    'C357532 Check that "Title level requests" section on Request Detail page and New Request page counted correctly (vega) (TaaS)',
    { tags: ['extendedPathBroken', 'vega', 'C357532'] },
    () => {
      // #1 Click on "Title" checkbox on Search & filter section
      Requests.selectTitleRequestLevel();
      // #2 Click on one of Title lever request created in preconditions
      Requests.selectFirstRequest(instanceData.instanceTitle);
      RequestDetail.waitLoading();
      // #3 Observe "Title level requests" section
      RequestDetail.checkTitleInformation({
        TLRs: '2',
        title: instanceData.instanceTitle,
      });
      // #4 Click on "Actions" drop down and click on "Edit" action
      EditRequest.openRequestEditForm();
      EditRequest.waitLoading('title');
      // #5 Observe "Title level requests" section
      EditRequest.verifyTitleInformation({
        titleLevelRequest: '2',
        title: instanceData.instanceTitle,
      });
      // #6 Go back to requests app
      cy.visit(TopMenu.requestsPath);
      Requests.waitLoading();
      // #7 Click on "Actions" dropdown and click on "New" action
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage(true);
      // #8,#9 Click on "Create title leve request" checkbox and Enter "Instance HRID" for instance from preconditions
      NewRequest.enterHridInfo(testData.instanceHRID);
      NewRequest.verifyTitleLevelRequestsCheckbox(true);
      NewRequest.verifyHridInformation([instanceData.title]);
      // #10 Observe "Title level requests" section
      NewRequest.checkTitleInformationSection({
        instanceTitle: instanceData.instanceTitle,
        titleLevelRequest: '2',
      });
    },
  );
});
