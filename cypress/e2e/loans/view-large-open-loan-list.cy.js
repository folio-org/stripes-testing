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
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Loans', () => {
  describe('Large Open Loan Lists - Same Instance', () => {
    const LOAN_COUNT = 210;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 1,
        holdingsCount: LOAN_COUNT,
        itemsCount: 1,
      }),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      user: {},
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

      cy.createTempUser([Permissions.uiUsersfeefinesView.gui]).then((userProperties) => {
        testData.user = userProperties;
        UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.user.userId);

        cy.wrap(testData.folioInstances[0].items).each((item, index) => {
          if (index % 50 === 0) {
            cy.getAdminToken();
          }
          cy.wait(100);
          Checkout.checkoutItemViaApi({
            itemBarcode: item.barcode,
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
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C451618 Check that user with 200+ open loans (Same instance, but different holdings) can see all Loan details (vega)',
      { tags: ['extendedPath', 'vega', 'C451618'] },
      () => {
        const loanIndexNearEnd = 205;

        UsersSearchPane.openUserCard(testData.user.username);
        Users.expandLoansAccordion();
        cy.wait(1000);

        Users.clickOpenLoansLink();
        cy.wait(2000);

        UserLoans.verifyNumberOfLoans(LOAN_COUNT);
        UserLoans.checkResultsInTheRowByBarcode(
          [testData.folioInstances[0].instanceTitle],
          testData.folioInstances[0].items[0].barcode,
        );

        const selectedItemBarcode = testData.folioInstances[0].items[loanIndexNearEnd].barcode;
        UserLoans.openLoanDetails(selectedItemBarcode);

        LoansPage.waitLoading();
        LoansPage.verifyResultsInTheRow(['Checked out', ITEM_STATUS_NAMES.CHECKED_OUT]);
        LoansPage.checkItemStatus(ITEM_STATUS_NAMES.CHECKED_OUT);
      },
    );
  });
});
