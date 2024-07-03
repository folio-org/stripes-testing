import TopMenu from '../../../support/fragments/topMenu';
import CirculationLog from '../../../support/fragments/circulation-log/searchPane';

describe('fse-circulation-log - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    'TC195286 - verify that circulation log module is displayed',
    { tags: ['sanity', 'fse', 'ui', 'circulation-log'] },
    () => {
      cy.visit(TopMenu.circulationLogPath);
      CirculationLog.waitLoading();
    },
  );
});
