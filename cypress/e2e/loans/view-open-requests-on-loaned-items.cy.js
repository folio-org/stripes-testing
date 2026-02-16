import uuid from 'uuid';

import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES, APPLICATION_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import AppPaths from '../../support/fragments/app-paths';
import Checkout from '../../support/fragments/checkout/checkout';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import LoansPage from '../../support/fragments/loans/loansPage';
import EditRequest from '../../support/fragments/requests/edit-request';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Loans', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ count: 1 }),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requesters: [],
    requestIds: [],
  };
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.PAGE, REQUEST_TYPES.HOLD, REQUEST_TYPES.RECALL],
    name: getTestEntityValue('RequestPolicyC3482'),
    id: uuid(),
  };

  before('Create test data', () => {
    cy.getAdminToken();

    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);

    Location.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });

    RequestPolicy.createViaApi(requestPolicyBody);

    for (let i = 0; i < 4; i++) {
      cy.createTempUser([
        Permissions.uiRequestsAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiUsersViewLoans.gui,
      ]).then((userProperties) => {
        testData.requesters.push(userProperties);
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          userProperties.userId,
          testData.servicePoint.id,
        );
      });
    }

    cy.wrap(null).then(() => {
      const itemData = testData.folioInstances[0];

      Checkout.checkoutItemViaApi({
        itemBarcode: itemData.barcodes[0],
        servicePointId: testData.servicePoint.id,
        userBarcode: testData.requesters[0].barcode,
      }).then((checkoutResponse) => {
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          holdingsRecordId: itemData.holdings[0].id,
          instanceId: itemData.instanceId,
          item: { barcode: itemData.barcodes[0] },
          itemId: checkoutResponse.itemId,
          pickupServicePointId: testData.servicePoint.id,
          requestDate: new Date(),
          requestLevel: REQUEST_LEVELS.ITEM,
          requestType: REQUEST_TYPES.RECALL,
          requesterId: testData.requesters[1].userId,
        })
          .then((request1) => {
            testData.requestIds.push(request1.body.id);
            return Requests.createNewRequestViaApi({
              fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
              holdingsRecordId: itemData.holdings[0].id,
              instanceId: itemData.instanceId,
              item: { barcode: itemData.barcodes[0] },
              itemId: checkoutResponse.itemId,
              pickupServicePointId: testData.servicePoint.id,
              requestDate: new Date(),
              requestLevel: REQUEST_LEVELS.ITEM,
              requestType: REQUEST_TYPES.RECALL,
              requesterId: testData.requesters[2].userId,
            });
          })
          .then((request2) => {
            testData.requestIds.push(request2.body.id);
            return Requests.createNewRequestViaApi({
              fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
              holdingsRecordId: itemData.holdings[0].id,
              instanceId: itemData.instanceId,
              item: { barcode: itemData.barcodes[0] },
              itemId: checkoutResponse.itemId,
              pickupServicePointId: testData.servicePoint.id,
              requestDate: new Date(),
              requestLevel: REQUEST_LEVELS.ITEM,
              requestType: REQUEST_TYPES.RECALL,
              requesterId: testData.requesters[3].userId,
            });
          })
          .then((request3) => {
            testData.requestIds.push(request3.body.id);

            cy.getCancellationReasonsApi({ limit: 1 }).then((cancellationReasons) => {
              const cancellationReasonId = cancellationReasons[0].id;
              const requestToCancel = {
                ...request3.body,
                status: 'Closed - Cancelled',
                cancelledByUserId: testData.requesters[3].userId,
                cancellationReasonId,
              };
              EditRequest.updateRequestApi(requestToCancel);
            });
          });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    cy.wrap(testData.requestIds).each((id) => {
      Requests.deleteRequestViaApi(id);
    });
    cy.wrap(testData.folioInstances).each((item) => {
      InventoryInstances.deleteInstanceViaApi({
        instance: item,
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
    });
    cy.wrap(testData.requesters).each((requester) => {
      UserEdit.changeServicePointPreferenceViaApi(requester.userId, [testData.servicePoint.id]);
      Users.deleteViaApi(requester.userId);
    });
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C3482 View open requests on loaned items (vega)',
    { tags: ['extendedPath', 'vega', 'C3482'] },
    () => {
      const itemBarcode = testData.folioInstances[0].barcodes[0];

      cy.login(testData.requesters[0].username, testData.requesters[0].password, {
        path: AppPaths.getOpenLoansPath(testData.requesters[0].userId),
        waiter: () => cy.wait(2000),
      });

      UserLoans.checkColumnContentInTheRowByBarcode(itemBarcode, 'Requests', '2');

      UserLoans.openLoanDetails(itemBarcode);
      LoansPage.waitLoading();

      LoansPage.verifyLinkRedirectsCorrectPage({ href: '/requests?', expectedPage: 'Requests' });

      Requests.waitLoading();
      Requests.findCreatedRequest(itemBarcode);
      Requests.selectNotYetFilledRequest();
      Requests.verifyRequestIsPresent(testData.requesters[1].barcode);
      Requests.verifyRequestIsPresent(testData.requesters[2].barcode);
      Requests.verifyRequestIsAbsent(testData.requesters[3].barcode);

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      Requests.findCreatedRequest(testData.requesters[1].barcode);
      Requests.selectFirstRequest(testData.folioInstances[0].instanceTitle);
      RequestDetail.waitLoading();
      RequestDetail.checkRequestStatus('Open - Not yet filled');

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      Requests.findCreatedRequest(testData.requesters[2].barcode);
      Requests.selectFirstRequest(testData.folioInstances[0].instanceTitle);
      RequestDetail.waitLoading();
      RequestDetail.checkRequestStatus('Open - Not yet filled');
    },
  );
});
