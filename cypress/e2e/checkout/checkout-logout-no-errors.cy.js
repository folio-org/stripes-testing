import { Permissions } from '../../support/dictionary';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Check out', () => {
  let servicePoint;
  const testData = {};

  before('Create test data', () => {
    cy.getAdminToken();

    ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
      servicePoint = sp;
    });

    cy.createTempUser([Permissions.checkoutAll.gui]).then((userProperties) => {
      testData.user = userProperties;

      UserEdit.addServicePointViaApi(servicePoint.id, testData.user.userId, servicePoint.id);

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.checkOutPath,
        waiter: Checkout.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C418580 Check that no errors appears after user logout from the "Check out" app (vega)',
    { tags: ['extendedPath', 'vega', 'C418580'] },
    () => {
      CheckOutActions.checkIsInterfacesOpened();
      CheckOutActions.checkOutUser(testData.user.barcode);
      cy.logout();

      const waitTime = Cypress.env('shortWait') ? 60000 : 1200000;
      cy.wait(waitTime);
    },
  );
});
