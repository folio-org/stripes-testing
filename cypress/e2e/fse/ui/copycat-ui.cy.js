import TopMenu from '../../../support/fragments/topMenu';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';

describe('fse-copycat - UI for productions tenants', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195639 - verify that profiles are displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'copycat'] },
    () => {
      cy.visit(TopMenu.settingsPath);
      SettingsInventory.goToSettingsInventory();
      SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.TARGET_PROFILES);
      Z3950TargetProfiles.verifyTargetProfilesListDisplayed();
    },
  );
});
