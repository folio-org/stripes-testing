import TopMenu from '../../../support/fragments/topMenu';
import Settings from '../../../support/fragments/settings/settingsPane';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import SoftwareVersions from '../../../support/fragments/settings/softwareVersions/software-versions';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import Modals from '../../../support/fragments/modals';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';

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
    `TC195469 - verify software versions page is displayed for ${Cypress.env('OKAPI_HOST')}`,
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
    `TC195765 - verify ECS settings options for ${Cypress.env('OKAPI_HOST')}`,
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
  // This capability set is chosen for the test as it is not assigned to EBSCOSupport role by default and its assignment does not cause any side effects.
  const acquisitionUnitsMembershipsManage = {
    table: CAPABILITY_TYPES.DATA,
    resource: 'Acquisitions-Units Memberships',
    action: CAPABILITY_ACTIONS.MANAGE,
  };

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.settingsAuthorizationRoles,
      waiter: AuthorizationRoles.waitContentLoading,
    });
    cy.allure().logCommandSteps();
    // close service point modal if it appears after login
    Modals.closeModalWithEscapeIfAny();
  });

  it(
    `FDOPS-5214 - verify EBSCOSupport role can be updated via UI for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'authorization-roles', 'sanity', 'FDOPS-5214'] },
    () => {
      // Step 1: Find and open EBSCOSupport role
      AuthorizationRoles.searchRole(ebscoSupportRoleName);
      AuthorizationRoles.clickOnRoleName(ebscoSupportRoleName);

      // Step 2: Open edit mode and assign 'Manage' capability set for Acquisition Units Memberships
      AuthorizationRoles.openForEdit(ebscoSupportRoleName);
      AuthorizationRoles.selectCapabilitySetCheckbox(acquisitionUnitsMembershipsManage);

      // Step 3: Save and verify the role was updated successfully
      AuthorizationRoles.clickSaveButton();
      AuthorizationRoles.checkAfterSaveEdit(ebscoSupportRoleName);

      // Step 4: Verify the capability set is now assigned in the view pane
      AuthorizationRoles.clickOnCapabilitySetsAccordion();
      AuthorizationRoles.verifyCapabilitySetCheckboxChecked(acquisitionUnitsMembershipsManage);

      // Navigate back to the roles list and re-open the role to ensure fresh data is loaded
      cy.visit(TopMenu.settingsAuthorizationRoles);
      AuthorizationRoles.waitContentLoading();
      AuthorizationRoles.searchRole(ebscoSupportRoleName);
      AuthorizationRoles.clickOnRoleName(ebscoSupportRoleName);

      // Step 5: Revert - open edit mode again and unassign the same capability set
      AuthorizationRoles.openForEdit(ebscoSupportRoleName);
      AuthorizationRoles.selectCapabilitySetCheckbox(acquisitionUnitsMembershipsManage, {
        isSelected: false,
      });
      AuthorizationRoles.clickSaveButton();
      AuthorizationRoles.checkAfterSaveEdit(ebscoSupportRoleName);
    },
  );
});
