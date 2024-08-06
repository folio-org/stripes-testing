import TopMenu from '../../../support/fragments/topMenu';
import ExportManager from '../../../support/fragments/exportManager/exportManagerSearchPane';

describe('fse-export-manager - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195312 - verify that export-manager module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'export-manager'] },
    () => {
      cy.visit(TopMenu.exportManagerPath);
      ExportManager.waitLoading();
    },
  );
});
