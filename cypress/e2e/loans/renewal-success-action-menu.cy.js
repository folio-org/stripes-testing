import uuid from 'uuid';
import moment from 'moment';
import { Permissions } from '../../support/dictionary';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import UsersCard from '../../support/fragments/users/usersCard';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Loans', () => {
  describe('Loans: Renewals', () => {
    let itemBarcode;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePoint(),
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
      itemBarcode = testData.folioInstances[0].barcodes[0];
      cy.createTempUser([Permissions.loansView.gui, Permissions.loansRenew.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            testData.user.userId,
            testData.servicePoint.id,
          );

          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode,
            loanDate: moment.utc().format(),
            servicePointId: testData.servicePoint.id,
            userBarcode: testData.user.barcode,
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.usersPath,
              waiter: UsersSearchPane.waitLoading,
            });
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      CheckInActions.checkinItemViaApi({
        itemBarcode,
        servicePointId: testData.servicePoint.id,
      });
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C564 Renewal: success, from action menu on open loans (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C564'] },
      () => {
        // Go to Users app. Find user with open loan. Click on "x open loan(s)" to open loans table.
        UsersSearchPane.searchByKeywords(testData.user.username);
        UsersCard.viewCurrentLoans();
        UserLoans.checkResultsInTheRowByBarcode([ITEM_STATUS_NAMES.CHECKED_OUT], itemBarcode);
        // Click on ellipsis at the end of the row and choose "Renew".
        UserLoans.renewItem(itemBarcode);
        // Renewal count in loans table is updated
        UserLoans.checkColumnContentInTheRowByBarcode(itemBarcode, 'Renewal count', '1');
      },
    );
  });
});
