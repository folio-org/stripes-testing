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
      'C350672 Verify Job profile - duplicate existing profile (firebird)',
      { tags: ['criticalPathBroken', 'firebird', 'C350672'] },
      () => {
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.clickProfileNameFromTheList(jobProfileName);
        SingleJobProfile.waitLoading(jobProfileName);

        SingleJobProfile.openActions();
        SingleJobProfile.clickDuplicateButton();
        SingleJobProfile.verifyProfileDetailsEditable();
        SingleJobProfile.clickCancelButton();

        ExportJobProfiles.clickProfileNameFromTheList(jobProfileName);
        SingleJobProfile.openActions();
        SingleJobProfile.clickDuplicateButton();
        SingleJobProfile.editJobProfile(jobProfileNewName);
        SingleJobProfile.clickCancelButton();

        ExportJobProfiles.clickProfileNameFromTheList(jobProfileName);
        SingleJobProfile.openActions();
        SingleJobProfile.clickDuplicateButton();
        SingleJobProfile.editJobProfile(jobProfileNewName);
        ExportNewJobProfile.saveJobProfile();

        InteractorsTools.checkCalloutMessage(secondNewJobProfileCalloutMessage);
        ExportJobProfiles.verifyJobProfileInTheTable(jobProfileNewName);
      },
    );
  });
});
