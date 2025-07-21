import uuid from 'uuid';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UserEdit from '../../support/fragments/users/userEdit';

describe('Users', () => {
  const usersData = {};
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    userServicePoint: ServicePoints.getDefaultServicePoint(),
  };
  let proxyBody;

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        cy.createTempUser().then((sponsorProperties) => {
          usersData.userSponsor = sponsorProperties;
          cy.getUsers({ limit: 1, query: `"username"="${usersData.userSponsor.username}"` }).then(
            (users) => {
              usersData.userSponsor.firstName = users[0].personal.preferredFirstName;
              usersData.userSponsor.middleName = users[0].personal.middleName;
            },
          );
        });
        cy.createTempUser().then((proxyProperties) => {
          usersData.userProxy = proxyProperties;
        });

        UserEdit.setupUserDefaultServicePoints(Cypress.env('diku_login'));
      })
      .then(() => {
        proxyBody = {
          userId: usersData.userSponsor.userId,
          proxyUserId: usersData.userProxy.userId,
          id: uuid(),
          requestForSponsor: 'Yes',
          notificationsTo: 'Sponsor',
          accrueTo: 'Sponsor',
          status: 'Active',
        };
        cy.createProxyApi(proxyBody);
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Locations.getDefaultLocation({
          servicePointId: testData.userServicePoint.id,
        }).location;
        Locations.createViaApi(testData.defaultLocation)
          .then((location) => {
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: testData.folioInstances,
              location,
            });
          })
          .then(() => {
            testData.itemBarcode = testData.folioInstances[0].barcodes[0];
            testData.itemId = testData.folioInstances[0].itemIds[0];
          });
      });
    cy.loginAsAdmin({
      path: TopMenu.checkOutPath,
      waiter: Checkout.waitLoading,
    });
  });

  after('Deleting created entities', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: testData.itemBarcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    cy.deleteProxyApi(proxyBody.id);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(usersData.userSponsor.userId);
    Users.deleteViaApi(usersData.userProxy.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C433 Test that proxy user can checkout on the behalf of the user (volaris)',
    { tags: ['criticalPath', 'volaris', 'C433', 'eurekaPhase1'] },
    () => {
      CheckOutActions.checkOutUser(usersData.userProxy.barcode);
      CheckOutActions.chooseActingPatron(usersData.userSponsor.lastName);
      CheckOutActions.checkOutItem(testData.itemBarcode);
      Checkout.verifyResultsInTheRow([testData.itemBarcode]);
      CheckOutActions.openLoanDetails();
      LoanDetails.checkKeyValue(
        'Borrower',
        `${usersData.userSponsor.lastName}, ${usersData.userSponsor.firstName} ${usersData.userSponsor.middleName}`,
      );
    },
  );
});
