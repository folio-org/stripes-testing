import { Permissions } from '../../support/dictionary';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Check out', () => {
  describe('Checkout loans count updates', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({ count: 3 }),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    let userData;

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

      cy.createTempUser([
        Permissions.checkoutCirculatingItems.gui,
        Permissions.uiUsersViewLoans.gui,
      ]).then((userProperties) => {
        userData = userProperties;
        userData.personal = {
          lastname: userProperties.username,
          firstName: userProperties.firstName,
        };
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          userData.userId,
          testData.servicePoint.id,
        );

        cy.login(userData.username, userData.password, {
          path: TopMenu.checkOutPath,
          waiter: Checkout.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.folioInstances.forEach((instance) => {
        InventoryInstances.deleteInstanceViaApi({
          instance,
          servicePoint: testData.servicePoint,
          shouldCheckIn: true,
        });
      });
      Users.deleteViaApi(userData.userId);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
    });

    it(
      'C560 Find user with no open loans. Complete 3 checkouts for different items. Make sure that loans count updates properly after each checkout. (vega)',
      { tags: ['smoke', 'vega', 'C560'] },
      () => {
        CheckOutActions.checkOutUser(userData.barcode);
        CheckOutActions.waitForPatronSpinnerToDisappear();
        CheckOutActions.checkUserInfo(userData);
        CheckOutActions.verifyOpenLoansCount(0);

        CheckOutActions.checkOutItem(testData.folioInstances[0].barcodes[0]);
        CheckOutActions.verifyItemCheckedOut(testData.folioInstances[0].barcodes[0]);
        CheckOutActions.verifyOpenLoansCount(1);

        CheckOutActions.checkOutItem(testData.folioInstances[1].barcodes[0]);
        CheckOutActions.verifyItemCheckedOut(testData.folioInstances[1].barcodes[0]);
        CheckOutActions.verifyOpenLoansCount(2);

        CheckOutActions.checkOutItem(testData.folioInstances[2].barcodes[0]);
        CheckOutActions.verifyItemCheckedOut(testData.folioInstances[2].barcodes[0]);
        CheckOutActions.verifyOpenLoansCount(3);
      },
    );
  });
});
