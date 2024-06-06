import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('fse-users - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    'TC195391 - verify that users page is displayed',
    { tags: ['sanity', 'fse', 'ui', 'users'] },
    () => {
      cy.visit(TopMenu.usersPath);
      Users.waitLoading();
    },
  );
});
