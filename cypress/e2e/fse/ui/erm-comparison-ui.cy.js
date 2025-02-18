import TopMenu from '../../../support/fragments/topMenu';
import ErmComparison from '../../../support/fragments/erm-comparison/ermComparison';

describe('fse-erm-comparison - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195305 - verify that erm-comparison module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'folio_erm-comparisons', 'erm-comparisons'] },
    () => {
      cy.visit(TopMenu.ermComparisonPath);
      ErmComparison.waitLoading();
    },
  );
});
