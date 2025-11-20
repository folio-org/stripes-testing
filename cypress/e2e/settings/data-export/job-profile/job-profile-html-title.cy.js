import permissions from '../../../../support/dictionary/permissions';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import SingleJobProfile from '../../../../support/fragments/data-export/exportJobProfile/singleJobProfile';
import SelectJobProfile from '../../../../support/fragments/data-export/selectJobProfile';
import SettingsDataExport from '../../../../support/fragments/data-export/settingsDataExport';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

let user;
const jobProfile = {
  name: getTestEntityValue('jobProfile'),
  newName: getTestEntityValue('newJobProfile'),
  mappingProfile: 'Default authority mapping profile',
};
const callout = `Job profile ${jobProfile.name} has been successfully created`;

describe('Data Export', () => {
  describe('Job profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password);
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C410765 Verify "Data export -> Job profiles" settings HTML page title format (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C410765'] },
      () => {
        TopMenuNavigation.navigateToApp('Settings');
        SettingsDataExport.verifyPageTitle('Settings - FOLIO');
        SettingsDataExport.goToSettingsDataExport();
        SettingsDataExport.verifyPageTitle('Data export settings - FOLIO');
        ExportJobProfiles.verifyJobProfilesElements();
        SelectJobProfile.verifyExistingJobProfiles();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);
        SettingsDataExport.verifyPageTitle('Data export settings - Job profiles - FOLIO');
        ExportJobProfiles.clickProfileNameFromTheList('Default instances export job profile');
        SingleJobProfile.waitLoading();
        SingleJobProfile.verifyElements();
        SettingsDataExport.verifyPageTitle(
          'Data export settings - Default instances export job profile - FOLIO',
        );
        SingleJobProfile.openActions();
        SingleJobProfile.clickDuplicateButton();
        SettingsDataExport.verifyPageTitle('Data export settings - New job profile - FOLIO');
        SingleJobProfile.clickCancelButton();
        SingleJobProfile.waitLoading();
        ExportJobProfiles.openNewJobProfileForm();
        ExportNewJobProfile.verifyNewJobProfileForm();
        SettingsDataExport.verifyPageTitle('Data export settings - New job profile - FOLIO');
        ExportNewJobProfile.fillJobProfile(jobProfile.name, jobProfile.mappingProfile);
        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(callout);
        ExportJobProfiles.verifyJobProfileInTheTable(jobProfile.name);
        SettingsDataExport.verifyPageTitle('Data export settings - Job profiles - FOLIO');
        ExportJobProfiles.clickProfileNameFromTheList(jobProfile.name);
        SettingsDataExport.verifyPageTitle(`Data export settings - ${jobProfile.name} - FOLIO`);
        SingleJobProfile.openActions();
        SingleJobProfile.clickEditButton();
        SettingsDataExport.verifyPageTitle(`Data export settings - ${jobProfile.name} - FOLIO`);
        SingleJobProfile.editJobProfile(jobProfile.newName);
        ExportNewJobProfile.saveJobProfile();
        ExportJobProfiles.verifyJobProfileInTheTable(jobProfile.newName);
        ExportJobProfiles.clickProfileNameFromTheList(jobProfile.newName);
        SettingsDataExport.verifyPageTitle(`Data export settings - ${jobProfile.newName} - FOLIO`);
        SingleJobProfile.deleteMappingProfile(jobProfile.newName);
        SettingsDataExport.verifyPageTitle('Data export settings - Job profiles - FOLIO');
      },
    );
  });
});
