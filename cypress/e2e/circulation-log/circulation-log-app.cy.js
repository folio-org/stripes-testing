import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { LOCATION_IDS, LOCATION_NAMES } from '../../support/constants';

describe('Circulation log', () => {
  let userData;
  let servicePoint;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
  };

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
      servicePoint = sp;
    });
    InventoryInstances.createFolioInstancesViaApi({
      folioInstances: testData.folioInstances,
      location: { id: LOCATION_IDS.MAIN_LIBRARY, name: LOCATION_NAMES.MAIN_LIBRARY },
    });
    cy.createTempUser([
      permissions.uiUserEdit.gui,
      permissions.uiUserCanAssignUnassignPermissions.gui,
    ])
      .then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(servicePoint.id, userData.userId);
      })
      .then(() => {
        Checkout.checkoutItemViaApi({
          itemBarcode: testData.folioInstances[0].barcodes[0],
          servicePointId: servicePoint.id,
          userBarcode: userData.barcode,
        });
        cy.loginAsAdmin({ path: TopMenu.circulationLogPath, waiter: SearchPane.waitLoading });
      });
  });

  after('Delete test data', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: testData.folioInstances[0].barcodes[0],
      servicePointId: servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint,
      shouldCheckIn: true,
    });
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
