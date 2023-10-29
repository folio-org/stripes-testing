import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import SettingsDataExport from '../../../support/fragments/data-export/settingsDataExport';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import SingleJobProfile from '../../../support/fragments/data-export/exportJobProfile/singleJobProfile';
import InteractorsTools from '../../../support/utils/interactorsTools';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import SingleFieldMappingProfilePane from '../../../support/fragments/data-export/exportMappingProfile/singleFieldMappingProfilePane';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';


let user;
const mappingProfile = {
  name: `Mapping-Profile-${getRandomPostfix()}`,
  newName: `New-Mapping-Profile-${getRandomPostfix()}`,
  newDescription: `New-Mapping-Profile-${getRandomPostfix()}`
};
const callout = `The field mapping profile ${mappingProfile.name} has been successfully created`;

describe('Job profile - setup', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password);
    });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C410768 Verify "Data export -> Field mapping profiles" settings HTML page title format (firebird) (TaaS)',
    { tags: [testTypes.extendedPath, devTeams.firebird] },
    () => {
      TopMenuNavigation.navigateToApp('Settings');
      SettingsDataExport.verifyPageTitle('Settings - FOLIO');
      SettingsDataExport.goToSettingsDataExport();
      SettingsDataExport.verifyPageTitle('Data export settings - FOLIO');
      ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
      ExportFieldMappingProfiles.verifyFieldMappingProfilesPane();
      SettingsDataExport.verifyPageTitle('Data export settings - Field mapping profiles - FOLIO');
      SingleFieldMappingProfilePane.clickProfileNameFromTheList('Default holdings mapping profile');
      SingleFieldMappingProfilePane.waitLoading();
      SingleFieldMappingProfilePane.verifyElements();
      SettingsDataExport.verifyPageTitle('Data export settings - Default holdings mapping profile - FOLIO');
      SingleFieldMappingProfilePane.openActions();
      SingleFieldMappingProfilePane.clickDuplicateButton();
      SettingsDataExport.verifyPageTitle('Data export settings - New field mapping profile - FOLIO');
      SingleFieldMappingProfilePane.clickCancelButton();
      ExportFieldMappingProfiles.openNewMappingProfileForm();
      SettingsDataExport.verifyPageTitle('Data export settings - New field mapping profile - FOLIO');
      ExportNewFieldMappingProfile.createNewFieldMappingProfileWithoutTransformations(mappingProfile.name);
      ExportFieldMappingProfiles.saveMappingProfile();
      InteractorsTools.checkCalloutMessage(callout);
      ExportFieldMappingProfiles.verifyProfileNameOnTheList(mappingProfile.name);
      SettingsDataExport.verifyPageTitle('Data export settings - Field mapping profiles - FOLIO');
      ExportJobProfiles.clickProfileNameFromTheList(mappingProfile.name);
      SettingsDataExport.verifyPageTitle(`Data export settings - ${mappingProfile.name} - FOLIO`);
      SingleFieldMappingProfilePane.openActions();
      SingleFieldMappingProfilePane.editFieldMappingProfile(mappingProfile.newName, mappingProfile.newDescription);
      ExportFieldMappingProfiles.saveMappingProfile();
      ExportFieldMappingProfiles.verifyProfileNameOnTheList(mappingProfile.newName);
      ExportFieldMappingProfiles.clickProfileNameFromTheList(mappingProfile.newName);
      SettingsDataExport.verifyPageTitle(`Data export settings - ${mappingProfile.newName} - FOLIO`);
      ExportFieldMappingProfiles.deleteMappingProfile(mappingProfile.newName);
      SettingsDataExport.verifyPageTitle('Data export settings - Field mapping profiles - FOLIO');
    },
  );
});
