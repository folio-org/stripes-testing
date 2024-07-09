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
    'TC195305 - verify that erm-comparison module is displayed',
    { tags: ['fse', 'ui', 'erm-comparison'] },
    () => {
      cy.visit(TopMenu.ermComparisonPath);
      ErmComparison.waitLoading();
    },
  );
});
