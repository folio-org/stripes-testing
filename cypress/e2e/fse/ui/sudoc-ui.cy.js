import TopMenu from '../../../support/fragments/topMenu';
import Sudoc from '../../../support/fragments/sudoc/sudoc';

describe('fse-sudoc - UI for productions tenants', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.sudocPath,
      waiter: Sudoc.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TCxxx - verify that sudoc page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['mod-sudoc', 'fse', 'ui'] },
    () => {
      Sudoc.checkTableDisplayed();
    },
  );
});
