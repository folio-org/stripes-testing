import TopMenu from '../../../support/fragments/topMenu';
import Settings from '../../../support/fragments/settings/settingsPane';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import SoftwareVersions from '../../../support/fragments/settings/softwareVersions/software-versions';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('fse-settings - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.settingsPath,
      waiter: Settings.waitSettingsPaneLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195382 - verify that settings page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'settings'] },
    () => {
      Settings.waitSettingsPaneLoading();
    },
  );

  it(
    `TC195469 - verify software versions page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'settings', 'software-version'] },
    () => {
      SoftwareVersions.selectSoftwareVersions();
      SoftwareVersions.waitLoading();
      SoftwareVersions.checkErrorNotDisplayed();
      cy.wait(2000);
      SoftwareVersions.logSoftwareVersion();
    },
  );

  it(
    `TC195765 - verify ECS settings options for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['ramsons', 'fse', 'ui', 'settings', 'consortia'] },
    () => {
      cy.visit(SettingsMenu.consortiumManagerPath);
      ConsortiumManager.waitLoading();
      ConsortiumManager.checkOptionsExist();
    },
  );
});
