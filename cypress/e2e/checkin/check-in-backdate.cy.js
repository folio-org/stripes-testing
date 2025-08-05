import TopMenu from '../../support/fragments/topMenu';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Users from '../../support/fragments/users/users';
import Checkout from '../../support/fragments/checkout/checkout';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import { Permissions } from '../../support/dictionary';
import { DateTools } from '../../support/utils';
import AppPaths from '../../support/fragments/app-paths';

describe('Check in backdate', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  let userData;
  let itemBarcode;

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
    itemBarcode = testData.folioInstances[0].barcodes[0];
    cy.createTempUser([Permissions.checkinAll.gui, Permissions.loansView.gui]).then(
      (userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);
        Checkout.checkoutItemViaApi({
          itemBarcode: testData.folioInstances[0].barcodes[0],
          servicePointId: testData.servicePoint.id,
          userBarcode: userData.barcode,
        });
        cy.login(userData.username, userData.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode,
      servicePointId: testData.servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Locations.deleteViaApi(testData.defaultLocation);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C587 Check in: backdate check ins (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C587'] },
    () => {
      const itemEditedReturnTime = '2:00 AM';
      const today = new Date();
      const itemEditedReturnDateWithoutZero = DateTools.getFormattedDateWithSlashes({
        date: today,
      });
      const itemEditedReturnDate = DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY');

      // Find an open loan that is not overdue
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      UserLoans.openLoanDetails(itemBarcode);

      // Edit Date returned and Time returned
      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.editDateAndTimeReturned(itemEditedReturnDate, itemEditedReturnTime);
      // Enter barcode of item being checked in
      CheckInActions.checkInItemGui(itemBarcode);
      // Time returned is time entered
      CheckInActions.checkTimeReturned(0, itemEditedReturnTime);

      // Under Actions click on loan details
      CheckInActions.openLoanDetails(userData.username);
      // Return date/time are the values entered at check in
      LoanDetails.checkKeyValue(
        'Return date',
        `${itemEditedReturnDateWithoutZero}, ${itemEditedReturnTime}`,
      );
      // Item status is available
      LoanDetails.checkKeyValue('Item status', 'Available');
    },
  );
});
