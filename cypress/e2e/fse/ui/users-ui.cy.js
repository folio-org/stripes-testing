import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UsersCard from '../../../support/fragments/users/usersCard';
import Modals from '../../../support/fragments/modals';

describe('fse-users - UI (no data manipulation)', () => {
  let adminId;
  before(() => {
    cy.getAdminToken();
    cy.getAdminUserId().then((id) => {
      adminId = id;
    });
  });

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.usersPath,
      waiter: Users.waitLoading,
    });
    cy.allure().logCommandSteps();
    // close service point modal if it appears after login
    Modals.closeModalWithEscapeIfAny();
  });

  it(
    `TC195391 - verify that users page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'users', 'TC195391'] },
    () => {
      UsersSearchPane.searchByKeywords(adminId);
      UsersSearchPane.openUser(adminId);
      UsersCard.verifyUserCardOpened();
    },
  );
});
