import TopMenu from '../../../support/fragments/topMenu';
import Settings from '../../../support/fragments/settings/settingsPane';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import SoftwareVersions from '../../../support/fragments/settings/softwareVersions/software-versions';

describe('fse-settings - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195382 - verify that settings page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'settings'] },
    () => {
      cy.visit(TopMenu.settingsPath);
      Settings.waitLoading();
    },
  );

  it(
    `TC195469 - verify software versions page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'settings', 'software-version'] },
    () => {
      cy.visit(SettingsMenu.softwareVersionsPath);
      SoftwareVersions.waitLoading();
      SoftwareVersions.checkErrorNotDisplayed();
    },
  );
});
