import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import JobProfiles from '../../../support/fragments/settings/data-export/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfiles from '../../../support/fragments/settings/data-export/fieldMappingProfiles';
import InteractorsTools from '../../../support/utils/interactorsTools';
import CreateFieldMappingProfile from '../../../support/fragments/settings/data-export/createFieldMappingProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/settings/data-export/deleteFieldMappingProfile';

let user;
let fieldMappingProfileId;
let newJobProfileName = `jobProfile${getRandomPostfix()}`
let secondNewJobProfileName = `secondJobProfile${getRandomPostfix()}`
let fieldMappingProfileName = `fieldMappingProfile${getRandomPostfix()}`;
let newJobProfileCalloutMessage = `Job profile ${newJobProfileName} has been successfully created`
let secondNewJobProfileCalloutMessage = `Job profile ${secondNewJobProfileName} has been successfully created`
let newJobProfileDescription = `Decription${getRandomPostfix()}`

describe('settings: data-export', () => {
  before('create user, job and navigate to page', () => {
    cy.createTempUser([
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: TopMenu.settingsPath, waiter: SettingsPane.waitLoading });
      });

    CreateFieldMappingProfile.createFieldMappingProfileViaApi(fieldMappingProfileName)
      .then((response) => {
        fieldMappingProfileId = response.body.id;
      })
  });

  after('delete jobas and user', () => {
    JobProfiles.getJobProfile({ query: `"name"=="${newJobProfileName}"` })
      .then(response => {
        JobProfiles.deleteJobProfileViaApi(response.id);
      });
    JobProfiles.getJobProfile({ query: `"name"=="${secondNewJobProfileName}"` })
      .then(response => {
        JobProfiles.deleteJobProfileViaApi(response.id);
      });
    DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(fieldMappingProfileId);
    Users.deleteViaApi(user.userId);
  });

  it('C10953 Create a new job profile (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    JobProfiles.goToJobProfilesTab();
    JobProfiles.clickNewJobProfile();
    JobProfiles.verifyNewJobProfileForm();

    JobProfiles.clickNameTextfield();
    JobProfiles.clickDescriptionTextarea();
    JobProfiles.verifyNameValidationError();

    JobProfiles.fillinNameTextfield(newJobProfileName);
    JobProfiles.verifyNameValidationErrorGone();
    JobProfiles.verifySaveAndCloseButtonEnabled();

    JobProfiles.clickSelectMappingProfileDropdown();
    JobProfiles.clickNameTextfield();
    JobProfiles.verifySelectMappingProfileValidationError();

    JobProfiles.selectMappingProfileFromDropdown(fieldMappingProfileName);
    JobProfiles.verifySelectMappingProfileValidationErrorGone();

    JobProfiles.saveAndClose();
    InteractorsTools.checkCalloutMessage(newJobProfileCalloutMessage);
    JobProfiles.verifyJobProfileInTheTable(newJobProfileName);

    JobProfiles.clickNewJobProfile();
    JobProfiles.verifyNewJobProfileForm();

    JobProfiles.fillinDescription(newJobProfileDescription);
    JobProfiles.saveAndClose();

    JobProfiles.verifyNameValidationError();
    JobProfiles.verifySelectMappingProfileValidationError();

    JobProfiles.fillinNameTextfield(secondNewJobProfileName);
    JobProfiles.selectMappingProfileFromDropdown(fieldMappingProfileName);
    JobProfiles.saveAndClose();

    InteractorsTools.checkCalloutMessage(secondNewJobProfileCalloutMessage);
    JobProfiles.verifyJobProfileInTheTable(secondNewJobProfileName);
  });
});
