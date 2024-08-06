import TopMenu from '../../../support/fragments/topMenu';
import Licenses from '../../../support/fragments/licenses/licenses';

describe('fse-licenses - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195331 - verify that licenses page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'licenses'] },
    () => {
      cy.visit(TopMenu.licensesPath);
      Licenses.waitLoading();
    },
  );
});
