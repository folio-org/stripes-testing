import TopMenu from '../../../support/fragments/topMenu';
import Serials from '../../../support/fragments/serials/serials';

describe('fse-receiving - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195636 - verify that serials page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'receiving'] },
    () => {
      cy.visit(TopMenu.serials);
      Serials.waitLoading();
    },
  );
});
