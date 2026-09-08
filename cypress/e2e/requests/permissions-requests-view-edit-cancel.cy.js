import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Requests', () => {
  describe('Permissions', () => {
    let editUser = {};
    let requestId;
    let servicePoint;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({ count: 1 }),
    };

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          TitleLevelRequests.enableTLRViaApi();
          ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
            servicePoint = sp;

            cy.getMainLibraryLocation().then((location) => {
              InventoryInstances.createFolioInstancesViaApi({
                folioInstances: testData.folioInstances,
                location: { id: location.id },
              });
            });

            cy.createTempUser([Permissions.uiRequestsEdit.gui]).then((userProperties) => {
              editUser = userProperties;
              UserEdit.addServicePointViaApi(servicePoint.id, editUser.userId, servicePoint.id);

              Requests.createNewRequestViaApi({
                fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
                instanceId: testData.folioInstances[0].instanceId,
                pickupServicePointId: servicePoint.id,
                requestDate: new Date(),
                requestLevel: REQUEST_LEVELS.TITLE,
                requestType: REQUEST_TYPES.PAGE,
                requesterId: editUser.userId,
              }).then((createdRequest) => {
                requestId = createdRequest.body.id;
              });
            });
          });
        })
        .then(() => {
          cy.login(editUser.username, editUser.password, {
            path: TopMenu.requestsPath,
            waiter: Requests.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Requests.deleteRequestViaApi(requestId);
      Users.deleteViaApi(editUser.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        testData.folioInstances[0].barcodes[0],
      );
    });

    it(
      'C3484 Permissions - Requests: View, edit, cancel (capability set "data - UI-Requests - edit") (vega)',
      { tags: ['extendedPath', 'vega', 'C3484'] },
      () => {
        // #1 Go to "Requests" app and search for request from Preconditions
        Requests.findCreatedRequest(testData.folioInstances[0].barcodes[0]);
        Requests.verifyCreatedRequest(testData.folioInstances[0].instanceTitle);

        // #2 Click on the request title
        Requests.selectFirstRequest(testData.folioInstances[0].instanceTitle);
        RequestDetail.waitLoading();

        // #3 Click "view requests in queue" hyperlink in "Request information" accordion
        RequestDetail.viewRequestsInQueue();
        Requests.verifySearchInputValue(testData.folioInstances[0].instanceId);
        Requests.verifyOpenRequestStatusesChecked();
        Requests.verifyRequestIsPresent(testData.folioInstances[0].instanceTitle);

        // #4 Navigate back to Request details pane and click "Actions" button
        Requests.selectFirstRequest(testData.folioInstances[0].instanceTitle);
        RequestDetail.waitLoading();
        RequestDetail.verifyActionsAvailableOptions(['Edit', 'Cancel request']);
      },
    );
  });
});
