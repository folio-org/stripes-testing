import TopMenu from '../../../support/fragments/topMenu';
import Settings from '../../../support/fragments/settings/settingsPane';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import SoftwareVersions from '../../../support/fragments/settings/softwareVersions/software-versions';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import Modals from '../../../support/fragments/modals';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES } from '../../../support/constants';
import { Localization } from '../../../support/fragments/settings/tenant/general';

describe('fse-settings - UI (no data manipulation)', () => {
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
    `TC195469 - verify software versions page is displayed for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['sanity', 'fse', 'ui', 'settings', 'software-version', 'TC195469'] },
    () => {
      SoftwareVersions.selectSoftwareVersions();
      SoftwareVersions.waitLoading();
      SoftwareVersions.checkErrorNotDisplayed();
      cy.wait(2000);
      SoftwareVersions.logSoftwareVersion();
    },
  );

  it(
    `TC195765 - verify ECS settings options for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['ramsons', 'fse', 'ui', 'settings', 'consortia', 'TC195765'] },
    () => {
      cy.visit(SettingsMenu.consortiumManagerPath);
      ConsortiumManager.waitLoading();
      ConsortiumManager.checkOptionsExist();
    },
  );
});

describe('fse-settings - UI (data manipulation part of sanity AQA suite - works with Support role only)', () => {
  const ebscoSupportRoleName = 'EBSCOSupportRole';

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: SettingsMenu.sessionLocalePath,
      waiter: Localization.americanEnglishButtonWaitLoading,
    });
    cy.allure().logCommandSteps();
    // close service point modal if it appears after login
    Modals.closeModalWithEscapeIfAny();
    // change session locale to English (temporary action, won't affect tenant settings)
    Localization.selectAmericanEnglish();
    // close service point modal if it appears switching locale
    Modals.closeModalWithEscapeIfAny();
  });

  it(
    `FDOPS-5214 - verify EBSCOSupport role can be updated via UI for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'ui', 'authorization-roles', 'sanity', 'FDOPS-5214'] },
    () => {
      let firstCapabilitySet;

      // Navigate to the roles list
      SettingsMenu.selectRoles();
      AuthorizationRoles.waitContentLoading();

      // Step 1: Find and open EBSCOSupport role
      AuthorizationRoles.searchRole(ebscoSupportRoleName);
      AuthorizationRoles.clickOnRoleName(ebscoSupportRoleName);

      // Step 2: Open edit mode and toggle whichever capability set is displayed first
      // (no matter which one it is or whether it's already selected)
      AuthorizationRoles.openForEdit(ebscoSupportRoleName);
      AuthorizationRoles.getFirstDisplayedCapabilitySet(CAPABILITY_TYPES.DATA).then(
        (capabilitySet) => {
          firstCapabilitySet = capabilitySet;
          AuthorizationRoles.selectCapabilitySetCheckbox(firstCapabilitySet, {
            isSelected: !firstCapabilitySet.checked,
          });
        },
      );

      // Step 3: Save and verify the role was updated successfully
      AuthorizationRoles.clickSaveButton();
      AuthorizationRoles.checkAfterSaveEdit(ebscoSupportRoleName);

      // Step 4: Verify the capability set's state was toggled in the view pane.
      // The view pane only lists capability sets assigned to the role: if it was
      // just assigned it shows up checked, if it was just unassigned it no longer
      // appears there at all.
      AuthorizationRoles.clickOnCapabilitySetsAccordion();
      cy.then(() => {
        if (firstCapabilitySet.checked) {
          AuthorizationRoles.verifyCapabilitySetCheckboxAbsent(firstCapabilitySet);
        } else {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(firstCapabilitySet, true);
        }
      });

      // Navigate back to the roles list and re-open the role to ensure fresh data is loaded
      SettingsMenu.selectRoles();
      AuthorizationRoles.waitContentLoading();
      AuthorizationRoles.searchRole(ebscoSupportRoleName);
      AuthorizationRoles.clickOnRoleName(ebscoSupportRoleName);

      // Step 5: Revert - open edit mode again and restore the original state
      AuthorizationRoles.openForEdit(ebscoSupportRoleName);
      cy.then(() => {
        AuthorizationRoles.selectCapabilitySetCheckbox(firstCapabilitySet, {
          isSelected: firstCapabilitySet.checked,
        });
      });
      AuthorizationRoles.clickSaveButton();
      AuthorizationRoles.checkAfterSaveEdit(ebscoSupportRoleName);
    },
  );
});
