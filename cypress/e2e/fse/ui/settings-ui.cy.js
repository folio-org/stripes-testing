import TopMenu from '../../../support/fragments/topMenu';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import SoftwareVersions from '../../../support/fragments/settings/softwareVersions/software-versions';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import Modals from '../../../support/fragments/modals';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import NumberGeneratorSettings from '../../../support/fragments/settings/users/numberGeneratorSettings';
import NumberGeneratorSequences from '../../../support/fragments/settings/service-interaction/numberGeneratorSequences';
import SettingsDataExport from '../../../support/fragments/data-export/settingsDataExport';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import SingleJobProfile from '../../../support/fragments/data-export/exportJobProfile/singleJobProfile';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import DisplaySettings from '../../../support/fragments/settings/inventory/instance-holdings-item/displaySettings';
import {
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
  DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES,
} from '../../../support/constants';
import { Localization } from '../../../support/fragments/settings/tenant/general';

describe('fse-settings - UI (no data manipulation)', () => {
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

  it(
    `FDOPS-xxxxx - verify Number generator options are displayed for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'ui', 'settings', 'users', 'number-generator', 'FDOPS-xxxxx'] },
    () => {
      SettingsMenu.selectMenuOption('Inventory');
      NumberGeneratorSettings.selectFromSettings();
      NumberGeneratorSettings.waitLoading();
      NumberGeneratorSettings.checkBarcodeOptionsExist();
    },
  );

  it(
    `FDOPS-xxxxx - verify Number generator sequences list the new scopes for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'ui', 'settings', 'service-interaction', 'number-generator', 'FDOPS-xxxx'] },
    () => {
      SettingsMenu.selectMenuOption('Service interaction');
      NumberGeneratorSequences.selectFromSettings();
      NumberGeneratorSequences.waitLoading();
      NumberGeneratorSequences.checkSequenceGroupsExist();
    },
  );

  it(
    `FDOPS-xxxxx - verify default data export job profiles are present and locked for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'ui', 'settings', 'data-export', 'FDOPS-xxxxx'] },
    () => {
      SettingsDataExport.goToSettingsDataExport();
      ExportJobProfiles.goToJobProfilesTab();
      ExportJobProfiles.waitLoading();
      ExportJobProfiles.clickProfileNameFromTheList(
        DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.LINKED_DATA,
      );
      SingleJobProfile.waitLoading(DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.LINKED_DATA);
      SingleJobProfile.verifyLockProfileCheckbox(false, true);
    },
  );

  it(
    `FDOPS-xxxx - verify tenant default display columns for Inventory search are configurable for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'ui', 'settings', 'inventory', 'FDOPS-xxxx'] },
    () => {
      SettingsInventory.goToSettingsInventory();
      SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.DISPLAY_SETTINGS);
      DisplaySettings.waitloading();
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
    `FDOPS-5214 - verify EBSCOSupport role can be updated via UI for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
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

      // Step 5: Revert - open edit mode again and unassign the same capability set
      AuthorizationRoles.openForEdit(ebscoSupportRoleName);
      AuthorizationRoles.selectCapabilitySetCheckbox(acquisitionUnitsMembershipsManage, false);
      AuthorizationRoles.clickSaveButton();
      AuthorizationRoles.checkAfterSaveEdit(ebscoSupportRoleName);
    },
  );
});
