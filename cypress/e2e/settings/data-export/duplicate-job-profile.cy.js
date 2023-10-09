import { getTestEntityValue } from '../../../support/utils/stringTools';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import InteractorsTools from '../../../support/utils/interactorsTools';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import SingleJobProfile from '../../../support/fragments/data-export/exportJobProfile/singleJobProfile';

let user;
let fieldMappingProfileId;
const mappingProfileName = getTestEntityValue('fieldMappingProfile');
const jobProfileName = getTestEntityValue('jobProfile');
const jobProfileNewName = getTestEntityValue('jobProfileNew');
const secondNewJobProfileCalloutMessage = `Job profile ${jobProfileNewName} has been successfully created`;

describe('Job profile - setup', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
      ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(mappingProfileName).then(
        (response) => {
          fieldMappingProfileId = response.body.id;
          ExportNewJobProfile.createNewJobProfileViaApi(jobProfileName, response.body.id);
        },
      );
    });
  });

  after('delete test data', () => {
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
    { tags: [testTypes.criticalPath, devTeams.firebird] },
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
