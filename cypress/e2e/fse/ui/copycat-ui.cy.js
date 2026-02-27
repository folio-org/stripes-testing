import TopMenu from '../../../support/fragments/topMenu';
import SettingsInventory from '../../../support/fragments/settings/inventory/settingsInventory';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import Settings from '../../../support/fragments/settings/settingsPane';
import Modals from '../../../support/fragments/modals';

describe('fse-copycat - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.settingsPath,
      waiter: Settings.waitSettingsPaneLoading,
    });
    cy.allure().logCommandSteps();
    // close service point modal if it appears after login
    Modals.closeModalWithEscapeIfAny();
  });

  it(
    `TC195639 - verify that profiles are displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'copycat', 'TC195639'] },
    () => {
      cy.wait(3000);
      SettingsInventory.goToSettingsInventoryNoInteractors();
      SettingsInventory.selectz3950ProfilesNoInteractors();
      Z3950TargetProfiles.verifyTargetProfilesListDisplayedNoIntearctors();
    },
  );
});
