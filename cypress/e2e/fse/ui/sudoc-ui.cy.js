import TopMenu from '../../../support/fragments/topMenu';
import Sudoc from '../../../support/fragments/sudoc/sudoc';

describe('fse-sudoc - UI (no data manipulation)', () => {
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
    `TC195780 - verify that sudoc page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['mod-sudoc', 'fse', 'ui', 'TC195780'] },
    () => {
      Sudoc.checkTableDisplayed();
    },
  );
});
