import { Permissions } from '../../support/dictionary';
import Helper from '../../support/fragments/finance/financeHelper';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Title Level Request', () => {
  let instanceHRID;
  let instanceId;
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const instanceTitle = `C411787${getRandomPostfix()}`;
  const itemBarcode = Helper.getRandomBarcode();

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      instanceId = InventoryInstances.createInstanceViaApi(instanceTitle, itemBarcode);
      ServicePoints.createViaApi(testData.userServicePoint);
      cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${instanceId}"` }).then(
        (instance) => {
          instanceHRID = instance.hrid;
          cy.deleteItemViaApi(instance.items[0].id);
          cy.deleteItemViaApi(instance.items[1].id);
        },
      );
      TitleLevelRequests.enableTLRViaApi();
      testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
      Location.createViaApi(testData.defaultLocation);
    });

    cy.createTempUser([Permissions.uiRequestsAll.gui, Permissions.inventoryAll.gui]).then(
      (userProperties) => {
        testData.user = userProperties;
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          testData.user.userId,
          testData.userServicePoint.id,
        ).then(() => {
          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.requestsPath,
              waiter: Requests.waitLoading,
            });
          });
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Requests.getRequestApi({ query: `(instance.title=="${instanceTitle}")` }).then(
      (requestResponse) => {
        Requests.deleteRequestViaApi(requestResponse[0].id);
      },
    );
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
      testData.userServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C411787 Check that user can create TLR Hold for Instance with no Items (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C411787'] },
    () => {
      NewRequest.openNewRequestPane();
      NewRequest.enterHridInfo(instanceHRID);
      NewRequest.enterRequesterBarcode(testData.user.barcode);
      NewRequest.verifyTitleLevelRequestsCheckbox(true);
      NewRequest.verifyRequestTypeHasOptions('Hold');
      NewRequest.chooseRequestType('Hold');
      NewRequest.choosePickupServicePoint(testData.userServicePoint.name);
      NewRequest.saveRequestAndClose();
      NewRequest.verifyRequestSuccessfullyCreated(testData.user.username);
    },
  );
});
