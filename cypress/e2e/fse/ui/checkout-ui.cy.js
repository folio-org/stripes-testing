import TopMenu from '../../../support/fragments/topMenu';
import Checkout from '../../../support/fragments/checkout/checkout';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import UserEdit from '../../../support/fragments/users/userEdit';

describe('fse-checkout - UI (data manipulation)', () => {
  let servicePointId;
  let userData = {};

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getAdminToken().then(() => {
      // create new user and assign a service point
      ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
        servicePointId = servicePoint.id;
      });
      cy.createTempUser([permissions.checkoutAll.gui], 'FSE AQA autotest').then(
        (userProperties) => {
          userData = userProperties;
          userData.middleName = getTestEntityValue('MiddleName');
          userData.preferredFirstName = getTestEntityValue('PreferredFirstName');
          UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
          cy.login(userData.username, userData.password, {
            path: TopMenu.checkOutPath,
            waiter: Checkout.waitLoading,
          });
        },
      );
    });
    cy.allure().logCommandSteps();
  });

  after('Delete test data', () => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getAdminToken();
    // delete created user
    Users.deleteViaApi(userData.userId);
    cy.allure().logCommandSteps();
  });

  it(
    `TC195283 - verify that checkout module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'checkout', 'nonProd', 'fse-user-journey', 'TC195283'] },
    () => {
      Checkout.waitLoading();
    },
  );
});
