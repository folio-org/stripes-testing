import TopMenu from '../../../support/fragments/topMenu';
import Receiving from '../../../support/fragments/receiving/receiving';

describe('fse-receiving - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195378 - verify that receiving page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'receiving'] },
    () => {
      cy.visit(TopMenu.receivingPath);
      Receiving.waitLoading();
    },
  );
});
