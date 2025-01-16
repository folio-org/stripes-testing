import TopMenu from '../../../support/fragments/topMenu';
import Checkout from '../../../support/fragments/checkout/checkout';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import UserEdit from '../../../support/fragments/users/userEdit';

describe('fse-checkout - UI', () => {
  let servicePointId;
  let userData = {};

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getAdminToken().then(() => {
      // create new user and assign a service point
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
        servicePointId = servicePoints[0].id;
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
    { tags: ['fse', 'ui', 'checkout', 'nonProd'] },
    () => {
      Checkout.waitLoading();
    },
  );
});
