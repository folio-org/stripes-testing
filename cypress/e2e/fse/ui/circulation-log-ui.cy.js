import TopMenu from '../../../support/fragments/topMenu';
import CirculationLog from '../../../support/fragments/circulation-log/searchPane';

describe('fse-circulation-log - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.circulationLogPath,
      waiter: CirculationLog.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195286 - verify that circulation log module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'circulation-log', 'TC195286'] },
    () => {
      CirculationLog.waitLoading();
    },
  );
});
