import TopMenu from '../../../support/fragments/topMenu';
import Receiving from '../../../support/fragments/receiving/receiving';

describe('fse-receiving - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.receivingPath,
      waiter: Receiving.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195378 - verify that receiving page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'receiving', 'TC195378'] },
    () => {
      Receiving.waitLoading();
    },
  );
});
