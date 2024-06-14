import TopMenu from '../../../support/fragments/topMenu';
import Settings from '../../../support/fragments/settings/settingsPane';

describe('fse-settings - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    'TC195382 - verify that settings page is displayed',
    { tags: ['sanity', 'fse', 'ui', 'settings'] },
    () => {
      cy.visit(TopMenu.settingsPath);
      Settings.waitLoading();
    },
  );
});
