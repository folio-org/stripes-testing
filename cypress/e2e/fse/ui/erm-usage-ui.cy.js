import TopMenu from '../../../support/fragments/topMenu';
import ErmUsage from '../../../support/fragments/erm-usage/ermUsage';

describe('fse-erm-usage - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.ermUsagePath,
      waiter: ErmUsage.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195310 - verify that erm-usage module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'folio_erm-usage', 'erm-usage', 'TC195310'] },
    () => {
      ErmUsage.waitLoading();
    },
  );
});
