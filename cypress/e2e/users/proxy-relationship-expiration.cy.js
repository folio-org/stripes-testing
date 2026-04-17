import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import DateTools from '../../support/utils/dateTools';

describe('Users', () => {
  const usersData = {};
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
    userServicePoint: ServicePoints.getDefaultServicePoint(),
  };
  let proxyBody;

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        cy.createTempUser([Permissions.uiUserProxies.gui, Permissions.checkoutAll.gui]).then(
          (userProperties) => {
            usersData.loginUser = userProperties;
          },
        );
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
            testData.itemBarcode1 = testData.folioInstances[0].barcodes[0];
            testData.itemBarcode2 = testData.folioInstances[1].barcodes[0];
          });
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          usersData.loginUser.userId,
          testData.userServicePoint.id,
        );
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    cy.getProxyApi({ query: `proxyUserId=${usersData.userProxy.userId}` }).then((proxies) => {
      cy.wrap(proxies).each((proxy) => {
        cy.deleteProxyApi(proxy.id);
      });
    });
    CheckInActions.checkinItemViaApi({
      itemBarcode: testData.itemBarcode1,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    CheckInActions.checkinItemViaApi({
      itemBarcode: testData.itemBarcode2,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(usersData.loginUser.userId);
    Users.deleteViaApi(usersData.userSponsor.userId);
    Users.deleteViaApi(usersData.userProxy.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode1);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode2);
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C434 Test proxy relationship. Proxy user expiration vs Proxy relationship expiration (volaris)',
    { tags: ['extendedPath', 'volaris', 'C434'] },
    () => {
      // Step 1-2: Navigate to Users and verify proxy relationship in sponsor record
      cy.login(usersData.loginUser.username, usersData.loginUser.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
      UsersSearchPane.searchByUsername(usersData.userSponsor.username);
      cy.wait(2000);
      UsersSearchPane.openUser(usersData.userSponsor.username);
      UsersCard.waitLoading();
      UsersCard.openProxySponsorAccordion();
      // Step 3: Verify proxy information appears in sponsor record
      UsersCard.verifyProxyNameDisplayed(usersData.userProxy.lastName);

      // Step 4: Check out for the sponsor using proxy's info
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
      Checkout.waitLoading();
      CheckOutActions.checkOutUser(usersData.userProxy.barcode);
      CheckOutActions.chooseActingPatron(usersData.userSponsor.lastName);
      CheckOutActions.waitForPatronSpinnerToDisappear();
      CheckOutActions.checkOutItem(testData.itemBarcode1);
      Checkout.verifyResultsInTheRow([testData.itemBarcode1]);
      CheckOutActions.endCheckOutSession();

      // Step 5: Set proxy user expiration date to the past (make inactive)
      cy.getAdminToken();
      cy.getUsers({ limit: 1, query: `"id"="${usersData.userProxy.userId}"` }).then((users) => {
        const proxyUser = users[0];
        proxyUser.expirationDate = DateTools.getPreviousDayDateForFiscalYear();
        cy.updateUser(proxyUser);
      });

      // Step 6: Try to check out to the sponsor using inactive proxy's info
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
      Checkout.waitLoading();
      CheckOutActions.checkOutUser(usersData.userProxy.barcode);
      CheckOutActions.verifyActingAsModalExists();
      CheckOutActions.verifyActingAsModalMessage('Proxy relationship expired');
      CheckOutActions.cancelActingAsModal();

      // Step 7: Patron is expired - checkout as self would fail (verified by Step 6 modal)

      // Step 8: Reactivate the proxy patron, but put expiration date in past for proxy relationship
      cy.getAdminToken();
      cy.getUsers({ limit: 1, query: `"id"="${usersData.userProxy.userId}"` }).then((users) => {
        const proxyUser = users[0];
        proxyUser.expirationDate = DateTools.getDayTomorrowDateForFiscalYear();
        cy.updateUser(proxyUser);
      });

      cy.updateProxyApi(proxyBody.id, {
        ...proxyBody,
        expirationDate: DateTools.getPreviousDayDateForFiscalYear(),
      });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByUsername(usersData.userSponsor.username);
      cy.wait(2000);
      UsersSearchPane.openUser(usersData.userSponsor.username);
      UsersCard.waitLoading();
      UsersCard.openProxySponsorAccordion();
      UsersCard.verifyProxyNameDisplayed(usersData.userProxy.lastName);
      UsersCard.verifyTextDisplayed(DateTools.getPreviousDayDateForUI());

      // Step 9: Check out as the proxy patron (for self) - should succeed
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
      Checkout.waitLoading();
      CheckOutActions.checkOutUser(usersData.userProxy.barcode);
      CheckOutActions.verifyActingAsModalExists();
      CheckOutActions.verifyActingAsModalMessage(usersData.userSponsor.lastName);
      CheckOutActions.selectSelfAndContinue();
      CheckOutActions.waitForPatronSpinnerToDisappear();
      CheckOutActions.checkOutItem(testData.itemBarcode2);
      Checkout.verifyResultsInTheRow([testData.itemBarcode2]);
    },
  );
});
