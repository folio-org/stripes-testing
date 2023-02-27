import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';

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

    ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(fieldMappingProfileName)
      .then((response) => {
        fieldMappingProfileId = response.body.id;
      })
  });

  after('delete jobs and user', () => {
    ExportJobProfiles.getJobProfile({ query: `"name"=="${newJobProfileName}"` })
      .then(response => {
        ExportJobProfiles.deleteJobProfileViaApi(response.id);
      });
    ExportJobProfiles.getJobProfile({ query: `"name"=="${secondNewJobProfileName}"` })
      .then(response => {
        ExportJobProfiles.deleteJobProfileViaApi(response.id);
      });
    DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(fieldMappingProfileId);
    Users.deleteViaApi(user.userId);
  });

  it('C10953 Create a new job profile (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    ExportJobProfiles.goToJobProfilesTab();
    ExportJobProfiles.openNewJobProfileForm();
    ExportNewJobProfile.verifyNewJobProfileForm();

    ExportNewJobProfile.clickNameTextfield();
    ExportNewJobProfile.clickDescriptionTextarea();
    ExportNewJobProfile.verifyNameValidationError();

    ExportNewJobProfile.fillinNameTextfield(newJobProfileName);
    ExportNewJobProfile.verifyNameValidationErrorGone();
    ExportNewJobProfile.verifySaveAndCloseButtonEnabled();

    ExportNewJobProfile.clickSelectMappingProfileDropdown();
    ExportNewJobProfile.clickNameTextfield();
    ExportNewJobProfile.verifySelectMappingProfileValidationError();

    ExportNewJobProfile.selectMappingProfileFromDropdown(fieldMappingProfileName);
    ExportNewJobProfile.verifySelectMappingProfileValidationErrorGone();

    ExportNewJobProfile.saveAndClose();
    InteractorsTools.checkCalloutMessage(newJobProfileCalloutMessage);
    ExportJobProfiles.verifyJobProfileInTheTable(newJobProfileName);

    ExportJobProfiles.openNewJobProfileForm();
    ExportNewJobProfile.verifyNewJobProfileForm();

    ExportNewJobProfile.fillinDescription(newJobProfileDescription);
    ExportNewJobProfile.saveAndClose();

    ExportNewJobProfile.verifyNameValidationError();
    ExportNewJobProfile.verifySelectMappingProfileValidationError();

    ExportNewJobProfile.fillinNameTextfield(secondNewJobProfileName);
    ExportNewJobProfile.selectMappingProfileFromDropdown(fieldMappingProfileName);
    ExportNewJobProfile.saveAndClose();

    InteractorsTools.checkCalloutMessage(secondNewJobProfileCalloutMessage);
    ExportJobProfiles.verifyJobProfileInTheTable(secondNewJobProfileName);
  });
});
