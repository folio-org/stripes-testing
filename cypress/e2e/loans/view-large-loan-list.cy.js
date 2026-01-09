import { ITEM_STATUS_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import LoansPage from '../../support/fragments/loans/loansPage';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Loans', () => {
  describe('Large Loan Lists', () => {
    const LOAN_COUNT = 210;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({ count: LOAN_COUNT }),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      user: {},
    };

    before('Create test data', function () {
      this.timeout(300000);

      cy.getAdminToken();
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
      Location.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });

      cy.createTempUser([Permissions.uiUsersfeefinesView.gui]).then((userProperties) => {
        testData.user = userProperties;
        UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.user.userId);

        cy.wrap(testData.folioInstances).each((instance, index) => {
          if (index % 50 === 0) {
            cy.getAdminToken();
          }
          cy.wait(100);
          Checkout.checkoutItemViaApi({
            itemBarcode: instance.barcodes[0],
            userBarcode: testData.user.barcode,
            servicePointId: testData.servicePoint.id,
          });
        });

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
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
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C451617 Check that user with 200+ open loans (different instances) can see all Loan details (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C451617'] },
      () => {
        const loanIndexNearEnd = 205;

        UsersSearchPane.openUserCard(testData.user.username);
        UsersCard.viewCurrentLoans({ openLoans: LOAN_COUNT });
        cy.wait(2000);

        UserLoans.verifyNumberOfLoans(LOAN_COUNT);

        const selectedItemBarcode = testData.folioInstances[loanIndexNearEnd].barcodes[0];
        UserLoans.openLoanDetails(selectedItemBarcode);

        LoansPage.waitLoading();
        LoansPage.verifyResultsInTheRow([ITEM_STATUS_NAMES.CHECKED_OUT]);
        LoansPage.checkItemStatus(ITEM_STATUS_NAMES.CHECKED_OUT);
      },
    );
  });
});
