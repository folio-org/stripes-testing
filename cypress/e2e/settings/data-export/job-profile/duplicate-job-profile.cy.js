import permissions from '../../../../support/dictionary/permissions';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import SingleJobProfile from '../../../../support/fragments/data-export/exportJobProfile/singleJobProfile';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

let user;
let fieldMappingProfileId;
const mappingProfileName = getTestEntityValue('fieldMappingProfile');
const jobProfileName = getTestEntityValue('jobProfile');
const jobProfileNewName = getTestEntityValue('jobProfileNew');
const secondNewJobProfileCalloutMessage = `Job profile ${jobProfileNewName} has been successfully created`;

describe('Data Export', () => {
  describe('Job profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
          user = userProperties;
          ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(mappingProfileName).then(
            (response) => {
              fieldMappingProfileId = response.body.id;
              ExportNewJobProfile.createNewJobProfileViaApi(jobProfileName, response.body.id);
            },
          );
          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      [jobProfileName, jobProfileNewName].forEach((name) => {
        ExportJobProfiles.getJobProfile({ query: `"name"=="${name}"` }).then((response) => {
          ExportJobProfiles.deleteJobProfileViaApi(response.id);
        });
      });
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(fieldMappingProfileId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C1003542 Verify Job profile - duplicate existing profile (firebird)',
      { tags: ['extendedPath', 'firebird', 'C1003542'] },
      () => {
        // Step 1: Go to the Settings - Data export
        // Step 2: Click on the "Job profile" option
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.waitLoading();

        // Step 3: Select an existing job profile different from default job profile
        ExportJobProfiles.searchJobProfile(jobProfileName);
        ExportJobProfiles.clickProfileNameFromTheList(jobProfileName);
        SingleJobProfile.waitLoading(jobProfileName);

        // Step 4: Click on Actions menu - Duplicate option
        SingleJobProfile.openActions();
        SingleJobProfile.clickDuplicateButton();
        SingleJobProfile.verifyProfileDetailsEditable();
        SingleJobProfile.verifyProfileFieldsValues(
          `Copy of ${jobProfileName}`,
          mappingProfileName,
          '',
        );

        // Step 5: Click on Cancel button without making any changes
        SingleJobProfile.clickCancelButton();

        // Step 6: Click on existing job profile different from default job profile - Select Duplicate option from Actions menu
        ExportJobProfiles.searchJobProfile(jobProfileName);
        ExportJobProfiles.clickProfileNameFromTheList(jobProfileName);
        SingleJobProfile.openActions();
        SingleJobProfile.clickDuplicateButton();

        // Step 7: Make changes to the Name, Mapping profile or Description from job profile form - Click to Cancel button
        SingleJobProfile.editJobProfile(jobProfileNewName);
        SingleJobProfile.clickCancelButton();

        // Step 8: Click on existing job profile different from default job profile - Select Duplicate option from Actions menu (Repeat Step 6)
        ExportJobProfiles.searchJobProfile(jobProfileName);
        ExportJobProfiles.clickProfileNameFromTheList(jobProfileName);
        SingleJobProfile.openActions();
        SingleJobProfile.clickDuplicateButton();

        // Step 9: Make changes to the Name, Mapping profile or Description from job profile form - Click to Save button
        SingleJobProfile.editJobProfile(jobProfileNewName);
        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(secondNewJobProfileCalloutMessage);
        ExportJobProfiles.searchJobProfile(jobProfileName);
        ExportJobProfiles.verifyJobProfileInTheTable(jobProfileNewName);
      },
    );
  });
});
