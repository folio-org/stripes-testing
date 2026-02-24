import Requests from '../../../support/fragments/requests/requests';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import permissions from '../../../support/dictionary/permissions';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';

describe('fse-requests - UI (no data manipulation)', () => {
  let userData = {};
  let servicePointId;

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getAdminToken().then(() => {
      // create new user and assign a service point
      ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
        servicePointId = servicePoint.id;
      });
      cy.createTempUser([permissions.uiRequestsView.gui], 'FSE AQA autotest').then(
        (userProperties) => {
          userData = userProperties;
          userData.middleName = getTestEntityValue('MiddleName');
          userData.preferredFirstName = getTestEntityValue('PreferredFirstName');
          UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
          cy.login(userData.username, userData.password, {
            path: TopMenu.requestsPath,
            waiter: Requests.waitLoading,
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
    `TC195690 - verify that requests page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['nonProd', 'fse', 'ui', 'requests', 'fse-user-journey', 'TC195690'] },
    () => {
      cy.visit(TopMenu.requestsPath);
      Requests.waitLoading();
    },
  );
});
