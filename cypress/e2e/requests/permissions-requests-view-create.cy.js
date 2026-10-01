import { REQUEST_TYPES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import SelectInstanceModal from '../../support/fragments/requests/selectInstanceModal';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Requests', () => {
  describe('Permissions', () => {
    let createUser = {};
    let userA = {};
    let userB = {};
    let servicePoint;
    const requestIds = [];
    const tagName = `AT_C3485_tag_${getRandomPostfix()}`.toLowerCase();
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({ count: 2, itemsCount: 2 }),
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
            cy.createTempUser([
              Permissions.uiRequestsCreate.gui,
              Permissions.uiRequestsEdit.gui,
              Permissions.uiTagsPermissionAll.gui,
            ]).then((userProperties) => {
              createUser = userProperties;
              UserEdit.addServicePointViaApi(servicePoint.id, createUser.userId, servicePoint.id);
            });

            cy.createTempUser([]).then((userAProperties) => {
              userA = userAProperties;
              UserEdit.addServicePointViaApi(servicePoint.id, userA.userId, servicePoint.id);
            });

            cy.createTempUser([]).then((userBProperties) => {
              userB = userBProperties;
              UserEdit.addServicePointViaApi(servicePoint.id, userB.userId, servicePoint.id);
            });
          });
        })
        .then(() => {
          cy.login(createUser.username, createUser.password, {
            path: TopMenu.requestsPath,
            waiter: Requests.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      requestIds.forEach((id) => Requests.deleteRequestViaApi(id));
      Users.deleteViaApi(createUser.userId);
      Users.deleteViaApi(userA.userId);
      Users.deleteViaApi(userB.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        testData.folioInstances[0].barcodes[0],
      );
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        testData.folioInstances[1].barcodes[0],
      );
    });

    it(
      'C3485 Permissions - Requests: View, create (vega)',
      { tags: ['extendedPath', 'vega', 'C3485'] },
      () => {
        // #1 Go to "Requests" app, click "Actions" button, select "New" option
        NewRequest.openNewRequestPane();
        NewRequest.waitLoadingNewRequestPage(true);

        // #2 Check "Create title level request" checkbox
        NewRequest.enableTitleLevelRequest();
        NewRequest.verifyTitleLevelRequestsCheckbox(true);

        // #3 Click "Title look-up" hyperlink
        NewRequest.openTitleLookUp();
        SelectInstanceModal.waitLoading();

        // #4 Search for Instance 1 and click on it
        SelectInstanceModal.searchByTitle(testData.folioInstances[0].instanceTitle);
        SelectInstanceModal.selectTheFirstInstance();

        // #5 Enter User A barcode, select request type, pickup service point, and save
        NewRequest.enterRequesterBarcode(userA.barcode);
        NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
        NewRequest.choosePickupServicePoint(servicePoint.name);
        NewRequest.saveRequestAndClose();
        cy.wait('@createRequest').then(({ response }) => {
          requestIds.push(response.body.id);
        });
        NewRequest.verifyRequestSuccessfullyCreated(`${userA.lastName}, ${userA.firstName}`);
        RequestDetail.waitLoading();
        RequestDetail.verifyPositionInQueue('1');

        // #6 Click "Actions" button on created request details pane, select "Duplicate"
        RequestDetail.openActions();
        RequestDetail.openDuplicateRequest();
        NewRequest.waitLoadingNewRequestPage(true);
        NewRequest.verifyTitleLevelRequestsCheckbox(true);

        // #7 Enter User B barcode, select request type, pickup service point, and save
        NewRequest.enterRequesterBarcode(userB.barcode);
        NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
        NewRequest.choosePickupServicePoint(servicePoint.name);
        NewRequest.saveRequestAndClose();
        cy.wait('@createRequest').then(({ response }) => {
          requestIds.push(response.body.id);
        });
        NewRequest.verifyRequestSuccessfullyCreated(`${userB.lastName}, ${userB.firstName}`);
        RequestDetail.waitLoading();
        RequestDetail.verifyPositionInQueue('2');

        // #8 Click "view requests in queue" hyperlink
        RequestDetail.viewRequestsInQueue();
        Requests.verifySearchInputValue(testData.folioInstances[0].instanceId);
        Requests.verifyOpenRequestStatusesChecked();
        Requests.verifyResultsCount(2);
        Requests.verifyRequestIsPresent(testData.folioInstances[0].barcodes[0]);
        Requests.verifyRequestIsPresent(testData.folioInstances[0].barcodes[1]);

        // #9 Click "Reset all", search for created requests by instance barcode
        Requests.clickResetAllButton();
        Requests.findCreatedRequest(testData.folioInstances[0].barcodes[0]);
        Requests.verifyRequestIsPresent(testData.folioInstances[0].instanceTitle);

        // #10 (Okapi only) Handled by user already having the correct permission set

        // #11 Log in as the same test user and repeat steps 1-5 for Instance 2
        NewRequest.openNewRequestPane();
        NewRequest.waitLoadingNewRequestPage(true);
        NewRequest.enableTitleLevelRequest();
        NewRequest.openTitleLookUp();
        SelectInstanceModal.waitLoading();
        SelectInstanceModal.searchByTitle(testData.folioInstances[1].instanceTitle);
        SelectInstanceModal.selectTheFirstInstance();
        NewRequest.enterRequesterBarcode(userA.barcode);
        NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
        NewRequest.choosePickupServicePoint(servicePoint.name);
        NewRequest.saveRequestAndClose();
        cy.wait('@createRequest').then(({ response }) => {
          requestIds.push(response.body.id);
        });
        NewRequest.verifyRequestSuccessfullyCreated(`${userA.lastName}, ${userA.firstName}`);
        RequestDetail.waitLoading();
        RequestDetail.verifyPositionInQueue('1');

        // #12 Click "Tag" icon on the top right of request details pane
        Requests.openTagsPane();
        Requests.waitLoadingTags();

        // #13 Enter unique tag name and click "Enter"
        Requests.addNewTag(tagName);
        Requests.verifyAssignedTags(tagName);

        // #14 Close request details pane, reset filters, search by created tag
        Requests.closePane('Request details');
        // Requests.clickResetAllButton();
        Requests.filterRequestsByTag(tagName);
        Requests.verifyRequestIsPresent(testData.folioInstances[1].instanceTitle);
      },
    );
  });
});
