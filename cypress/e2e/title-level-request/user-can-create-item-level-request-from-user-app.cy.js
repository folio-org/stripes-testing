import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Title Level Request', () => {
  describe('Create Item or Title level request', () => {
    let requestId;
    let instanceData;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };

    before('Preconditions:', () => {
      cy.getAdminToken();
      TitleLevelRequests.enableTLRViaApi();
      ServicePoints.createViaApi(testData.userServicePoint);
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.userServicePoint.id,
      }).location;
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });
      cy.createTempUser([
        permissions.usersViewRequests.gui,
        permissions.uiUsersView.gui,
        permissions.uiRequestsAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        instanceData = testData.folioInstances[0];
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          testData.user.userId,
          testData.userServicePoint.id,
        );

        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });

        UsersSearchPane.searchByKeywords(testData.user.username);
        UsersSearchPane.openUser(testData.user.username);
        UsersCard.waitLoading();
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      Requests.deleteRequestViaApi(requestId);
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
        testData.userServicePoint.id,
      ]);
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      InventoryInstances.deleteInstanceViaApi({
        instance: instanceData,
        servicePoint: testData.userServicePoint,
        shouldCheckIn: true,
      });
      Users.deleteViaApi(testData.user.userId);
      Locations.deleteViaApi(testData.defaultLocation);
    });

    it(
      'C350423 Check that user can create Item level request from User app (use Request accordion) (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C350423'] },
      () => {
        // Click on the Request on User page
        UsersCard.expandRequestSection();

        // Click on the "Create request" button
        UsersCard.createNewRequest();
        NewRequest.waitLoadingNewRequestPage();

        // Enter item barcode on Item information field and click on the Enter button
        NewRequest.enterItemInfo(instanceData.barcodes[0]);
        NewRequest.verifyItemInformation([
          instanceData.barcodes[0],
          ITEM_STATUS_NAMES.AVAILABLE,
          instanceData.instanceTitle,
        ]);

        // Pay attention on the Request information accordion
        NewRequest.verifyRequestInformation(ITEM_STATUS_NAMES.AVAILABLE);
        // Enter Requester barcode on Requester field and click on the Enter button
        NewRequest.enterRequesterInfoWithRequestType(
          {
            requesterBarcode: testData.user.barcode,
            pickupServicePoint: testData.userServicePoint.name,
          },
          REQUEST_TYPES.PAGE,
        );

        // Pay attention on the Requester information
        NewRequest.verifyRequesterInformation(testData.user.username, testData.user.barcode);

        // Select Pickup service point
        NewRequest.choosePickupServicePoint(testData.userServicePoint.name);

        // Click on the "Save&close" button
        NewRequest.saveRequestAndClose();
        cy.wait('@createRequest').then((intercept) => {
          requestId = intercept.response.body.id;
          cy.location('pathname').should('eq', `/requests/view/${requestId}`);
        });
        RequestDetail.waitLoading();
      },
    );
  });
});
