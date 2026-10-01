import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Requests', () => {
  describe('Permissions', () => {
    let viewUser = {};
    let manageUser = {};
    let requestId;
    let servicePoint;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({ count: 1 }),
    };

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
            servicePoint = sp;

            cy.getMainLibraryLocation().then((location) => {
              const locationId = location.id;

              InventoryInstances.createFolioInstancesViaApi({
                folioInstances: testData.folioInstances,
                location: { id: locationId },
              });
            });

            // view-only user (steps 1-4)
            cy.createTempUser([
              Permissions.uiRequestsView.gui,
              Permissions.uiTagsPermissionAll.gui,
            ]).then((viewUserProperties) => {
              viewUser = viewUserProperties;
              UserEdit.addServicePointViaApi(servicePoint.id, viewUser.userId, servicePoint.id);

              Requests.createNewRequestViaApi({
                fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
                holdingsRecordId: testData.folioInstances[0].holdings[0].id,
                instanceId: testData.folioInstances[0].instanceId,
                item: { barcode: testData.folioInstances[0].barcodes[0] },
                itemId: testData.folioInstances[0].items[0].id,
                pickupServicePointId: servicePoint.id,
                requestDate: new Date().toISOString(),
                requestLevel: REQUEST_LEVELS.ITEM,
                requestType: REQUEST_TYPES.PAGE,
                requesterId: viewUser.userId,
              }).then((createdRequest) => {
                requestId = createdRequest.body.id;
              });
            });

            // manage user (steps 6-7)
            cy.createTempUser([
              Permissions.uiRequestsAll.gui,
              Permissions.uiRequestsView.gui,
              Permissions.uiRequestsEdit.gui,
              Permissions.uiRequestsCreate.gui,
              Permissions.uiTagsPermissionAll.gui,
            ]).then((manageUserProperties) => {
              manageUser = manageUserProperties;
              UserEdit.addServicePointViaApi(servicePoint.id, manageUser.userId, servicePoint.id);
            });
          });
        })
        .then(() => {
          cy.login(viewUser.username, viewUser.password, {
            path: TopMenu.requestsPath,
            waiter: Requests.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Requests.deleteRequestViaApi(requestId);
      Users.deleteViaApi(viewUser.userId);
      Users.deleteViaApi(manageUser.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        testData.folioInstances[0].barcodes[0],
      );
    });

    it(
      'C3483 Permissions - Requests: View (vega)',
      { tags: ['extendedPath', 'vega', 'C3483'] },
      () => {
        // #1 Go to "Requests" app and search for request from Preconditions
        Requests.findCreatedRequest(testData.folioInstances[0].barcodes[0]);
        Requests.verifyCreatedRequest(testData.folioInstances[0].instanceTitle);

        // #2 Click on the request title
        Requests.selectFirstRequest(testData.folioInstances[0].instanceTitle);
        // #4 Click "Actions" button - it exists but contains no options for view-only user
        RequestDetail.verifyActionsMenuIsEmpty();

        // #3 Click "view requests in queue" hyperlink in "Request information" accordion
        RequestDetail.viewRequestsInQueue();
        Requests.verifySearchInputValue(testData.folioInstances[0].items[0].id);
        Requests.verifyOpenRequestStatusesChecked();
        Requests.verifyRequestIsPresent(testData.folioInstances[0].instanceTitle);

        // #5 As admin user, unassign view capability set and assign manage capability set
        // (implemented by switching to the manageUser who already has manage permissions)

        // #6 Login as Staff user with manage permissions and repeat Steps 1-3
        cy.login(manageUser.username, manageUser.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });
        Requests.findCreatedRequest(testData.folioInstances[0].barcodes[0]);
        Requests.selectFirstRequest(testData.folioInstances[0].instanceTitle);
        RequestDetail.waitLoading();

        // #7 Navigate back to Request details pane and verify all Actions options are present
        RequestDetail.verifyActionsAvailableOptions([
          'Edit',
          'Cancel request',
          'Duplicate',
          'Move request',
          'Reorder queue',
        ]);

        RequestDetail.viewRequestsInQueue();
        Requests.verifySearchInputValue(testData.folioInstances[0].items[0].id);
        Requests.verifyOpenRequestStatusesChecked();
        Requests.verifyRequestIsPresent(testData.folioInstances[0].instanceTitle);
      },
    );
  });
});
