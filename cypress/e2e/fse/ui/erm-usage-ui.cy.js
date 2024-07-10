import TopMenu from '../../../support/fragments/topMenu';
import ErmUsage from '../../../support/fragments/erm-usage/ermUsage';

describe('fse-erm-usage - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    'TC195310 - verify that erm-usage module is displayed',
    { tags: ['fse', 'ui', 'erm-usage'] },
    () => {
      cy.visit(TopMenu.ermUsagePath);
      ErmUsage.waitLoading();
    },
  );
});
