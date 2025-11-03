import permissions from '../../../support/dictionary/permissions';
import { APPLICATION_NAMES } from '../../../support/constants';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import SingleJobProfile from '../../../support/fragments/data-export/exportJobProfile/singleJobProfile';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import SingleFieldMappingProfilePane from '../../../support/fragments/data-export/exportMappingProfile/singleFieldMappingProfilePane';
import SettingsDataExport from '../../../support/fragments/data-export/settingsDataExport';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

let user;
const jobProfileName = 'Default instances export job profile';
const mappingProfileName = 'Default instance mapping profile';

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportSettingsViewOnly.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C422217 User with "settings - UI-Data-Export Settings - view" capability set is able to view but not edit data export settings (firebird)',
      { tags: ['extendedPath', 'firebird', 'C422217'] },
      () => {
        // Step 1: Verify available applications on the landing page
        TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.SETTINGS, true);
        TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.DATA_EXPORT, false);

        // Step 2: Go to the "Settings" app - already navigated in before hook
        SettingsPane.waitLoading();
        SettingsPane.verifyChooseSettingsIsDisplayed();

        // Step 3: Select the "Data export" option on "Settings" pane
        SettingsDataExport.goToSettingsDataExport();

        // Step 4: Click "Job profiles" option under "Profiles" label
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.verifyJobProfilesElements();
        ExportJobProfiles.verifyNewButtonAbsent();

        // Step 5: Click on any row with job profile (e.g. Default instances export job profile)
        ExportJobProfiles.clickProfileNameFromTheList(jobProfileName);
        SingleJobProfile.waitLoading(jobProfileName);
        SingleJobProfile.verifyActionsButtonAbsent();

        // Step 6: Click on "X" button
        SingleJobProfile.clickXButton();
        ExportJobProfiles.verifyJobProfilesElements();
        ExportJobProfiles.verifyNewButtonAbsent();

        // Step 7: Click "Field mapping profiles" option under "Profiles" label
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        ExportFieldMappingProfiles.verifyFieldMappingProfilesPane(false);
        ExportFieldMappingProfiles.verifySearchButtonEnabled(false);
        ExportFieldMappingProfiles.verifyNewButtonAbsent();

        // Step 8: Click any row with mapping profile (e.g. Default instance mapping profile)
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(mappingProfileName);
        SingleFieldMappingProfilePane.waitLoading(mappingProfileName);
        SingleFieldMappingProfilePane.verifyActionsButtonAbsent();

        // Step 9: Click on "X" button
        SingleFieldMappingProfilePane.clickXButton();
        ExportFieldMappingProfiles.verifyFieldMappingProfilesPane(false);
        ExportFieldMappingProfiles.verifySearchButtonEnabled(false);
        ExportFieldMappingProfiles.verifyNewButtonAbsent();
      },
    );
  });
});
