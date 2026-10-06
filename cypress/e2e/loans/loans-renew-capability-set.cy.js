import CapabilitySets from '../../support/dictionary/capabilitySets';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Checkout from '../../support/fragments/checkout/checkout';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import RenewConfirmationModal from '../../support/fragments/users/loans/renewConfirmationModal';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import Users from '../../support/fragments/users/users';

describe('Loans', () => {
  describe('Loans: Renewals', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
      servicePoint: ServicePoints.getDefaultServicePoint(),
      patronUser: {},
      staffUser: {},
    };
    let item1Barcode;
    let item2Barcode;

    before('Create test data', () => {
      item1Barcode = testData.folioInstances[0].barcodes[0];
      item2Barcode = testData.folioInstances[1].barcodes[0];
      cy.getAdminToken()
        .then(() => {
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
        })
        .then(() => {
          cy.createTempUser([]).then((patronProperties) => {
            testData.patronUser = patronProperties;
            Checkout.checkoutItemViaApi({
              itemBarcode: item1Barcode,
              servicePointId: testData.servicePoint.id,
              userBarcode: testData.patronUser.barcode,
            });
            Checkout.checkoutItemViaApi({
              itemBarcode: item2Barcode,
              servicePointId: testData.servicePoint.id,
              userBarcode: testData.patronUser.barcode,
            });
          });
        })
        .then(() => {
          cy.createTempUser([]).then((staffProperties) => {
            testData.staffUser = staffProperties;
            cy.assignCapabilitiesToExistingUser(
              testData.staffUser.userId,
              [],
              [CapabilitySets.uiUsersLoansRenew],
            );
          });
        })
        .then(() => {
          cy.waitForAuthRefresh(() => {
            cy.login(testData.staffUser.username, testData.staffUser.password, {
              path: TopMenu.usersPath,
              waiter: UsersSearchPane.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[1],
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(testData.patronUser.userId);
      Users.deleteViaApi(testData.staffUser.userId);
    });

    it(
      'C1405041 User with Loans-Renew capability set can view patron loans and renew them (vega)',
      { tags: ['extendedPath', 'vega', 'C1405041'] },
      () => {
        // Step 1: Open patron user's profile page
        UsersSearchPane.searchByKeywords(testData.patronUser.username);
        UsersSearchPane.openUser(testData.patronUser.username);
        UsersCard.waitLoading();

        // Step 2-3: Expand Loans accordion, verify 2 open loans link, open loans table
        UsersCard.viewCurrentLoans({ openLoans: 2 });
        UserLoans.waitLoading();

        // Step 4-5: Open action menu for Item 1, click Renew, verify renewal count = 1
        UserLoans.renewItem(item1Barcode);
        UserLoans.checkColumnContentInTheRowByBarcode(item1Barcode, 'Renewal count', '1');

        // Step 6: Select all open loans, click Renew, verify both items renewed in confirmation modal
        UserLoans.renewAllItems();
        RenewConfirmationModal.waitLoading();
        RenewConfirmationModal.verifyRenewConfirmationModal([
          { itemBarcode: item1Barcode, status: 'Item successfully renewed' },
          { itemBarcode: item2Barcode, status: 'Item successfully renewed' },
        ]);
        RenewConfirmationModal.closeModal();
        UserLoans.checkColumnContentInTheRowByBarcode(item1Barcode, 'Renewal count', '2');
        UserLoans.checkColumnContentInTheRowByBarcode(item2Barcode, 'Renewal count', '1');

        // Step 7: Open loan details for Item 2
        UserLoans.openLoanDetails(item2Barcode);
        LoanDetails.waitLoanDetailsLoading();

        // Step 8: Renew from loan details page, verify action and renewal count = 2
        UserLoans.renewItem(item2Barcode, true);
        LoanDetails.checkAction(0, 'Renewed');
        LoanDetails.checkKeyValue('Renewal count', '2');
      },
    );
  });
});
