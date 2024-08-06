import TopMenu from '../../../support/fragments/topMenu';
import LocalKbAdmin from '../../../support/fragments/local-kbAdmin/localKbAdmin';

describe('fse-local-kbAdmin - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195333 - verify that marc local KB admin page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'local-kbAdmin'] },
    () => {
      cy.visit(TopMenu.localKbAdmin);
      LocalKbAdmin.waitLoading();
    },
  );
});
