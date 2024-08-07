import TopMenu from '../../../support/fragments/topMenu';
import Checkin from '../../../support/fragments/check-in-actions/checkInActions';

describe('fse-checkin - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195282 - verify that checkin module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'checkin'] },
    () => {
      cy.visit(TopMenu.checkInPath);
      Checkin.waitLoading();
    },
  );
});
