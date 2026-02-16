import TopMenu from '../../../support/fragments/topMenu';
import ErmComparison from '../../../support/fragments/erm-comparison/ermComparison';

describe('fse-erm-comparison - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.ermComparisonPath,
      waiter: ErmComparison.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195305 - verify that erm-comparison module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'folio_erm-comparisons', 'erm-comparisons', 'TC195305'] },
    () => {
      ErmComparison.waitLoading();
    },
  );
});
