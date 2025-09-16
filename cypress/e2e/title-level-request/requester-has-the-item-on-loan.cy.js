import uuid from 'uuid';
import { REQUEST_TYPES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import Requests from '../../support/fragments/requests/requests';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Create Item or Title level request', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.HOLD],
    name: `page${getRandomPostfix()}`,
    id: uuid(),
  };
  let itemBarcode;

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      // Create test instance
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
      itemBarcode = testData.folioInstances[0].barcodes[0];
      RequestPolicy.createViaApi(requestPolicyBody);
      // Create test user
      cy.createTempUser([
        Permissions.uiRequestsView.gui,
        Permissions.uiRequestsCreate.gui,
        Permissions.uiRequestsAll.gui,
        Permissions.uiRequestsEdit.gui,
        Permissions.checkoutAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        // Add service point to user
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          testData.user.userId,
          testData.servicePoint.id,
        );
        // Checkout item
        Checkout.checkoutItemViaApi({
          itemBarcode,
          userBarcode: testData.user.barcode,
          servicePointId: testData.servicePoint.id,
        });
        // Login as test user
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
          authRefresh: true,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode,
      servicePointId: testData.servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C1286 Check error message when item already checked out (vega) (TaaS)',
    {
      tags: ['extendedPath', 'vega', 'C1286'],
    },
    () => {
      // Navigate to new request page
      NewRequest.openNewRequestPane();
      // Enter instance title
      NewRequest.enterItemInfo(itemBarcode);
      NewRequest.verifyItemInformation([itemBarcode, testData.folioInstances[0].instanceTitle]);
      NewRequest.enterRequesterBarcode(testData.user.barcode);
      NewRequest.chooseRequestType(requestPolicyBody.requestTypes[0]);
      // Select "Pickup service point"
      NewRequest.choosePickupServicePoint(testData.servicePoint.name);
      // Click on the "Save&close" button
      NewRequest.saveRequestAndClose();
      // Verify error message
      NewRequest.checkRequestIsNotAllowedLoanModal();
    },
  );
});
