import TopMenu from '../../../support/fragments/topMenu';
import Serials from '../../../support/fragments/serials/serials';

describe('fse-serials - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.serials,
      waiter: Serials.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195636 - verify that serials page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'serials', 'serials-management', 'TC195636'] },
    () => {
      Serials.waitLoading();
    },
  );
});
