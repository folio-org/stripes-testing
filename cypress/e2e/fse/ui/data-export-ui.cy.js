import TopMenu from '../../../support/fragments/topMenu';
import DataExport from '../../../support/fragments/data-export/exportFile';

describe('fse-data-export - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    'TC195288 - verify that data-export module is displayed',
    { tags: ['sanity', 'fse', 'ui', 'data-export'] },
    () => {
      cy.visit(TopMenu.dataExportPath);
      DataExport.waitLoading();
    },
  );
});
