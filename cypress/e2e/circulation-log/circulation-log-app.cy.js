import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Circulation log', () => {
  let userData;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  before('Create test data', () => {
    cy.getAdminToken();
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
    cy.createTempUser([
      permissions.uiUserEdit.gui,
      permissions.uiUserCanAssignUnassignPermissions.gui,
    ])
      .then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);
      })
      .then(() => {
        Checkout.checkoutItemViaApi({
          itemBarcode: testData.folioInstances[0].barcodes[0],
          servicePointId: testData.servicePoint.id,
          userBarcode: userData.barcode,
        });
        cy.loginAsAdmin({ path: TopMenu.circulationLogPath, waiter: SearchPane.waitLoading });
      });
  });

  after('Delete test data', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: testData.folioInstances[0].barcodes[0],
      servicePointId: testData.servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    Users.deleteViaApi(userData.userId);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C15483 Select and open the Circulation log app (volaris)',
    { tags: ['smoke', 'volaris', 'shiftLeft', 'C15483'] },
    () => {
      SearchPane.waitLoading();
    },
  );

  it(
    'C15484 Filter circulation log on item barcode (volaris)',
    { tags: ['smoke', 'volaris', 'shiftLeft', 'C15484'] },
    () => {
      SearchPane.searchByItemBarcode(testData.folioInstances[0].barcodes[0]);
      SearchPane.verifyResultCells();
      SearchPane.resetResults();
      cy.reload();
    },
  );

  it(
    'C15485 Filter circulation log on user barcode (volaris)',
    { tags: ['smoke', 'volaris', 'shiftLeft', 'C15485'] },
    () => {
      SearchPane.searchByUserBarcode(userData.barcode);
      SearchPane.verifyResultCells();
      SearchPane.resetResults();
    },
  );
});
