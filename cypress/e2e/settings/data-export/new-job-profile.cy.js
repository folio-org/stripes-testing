import testTypes from "../../../support/dictionary/testTypes";
import devTeams from "../../../support/dictionary/devTeams";
import permissions from "../../../support/dictionary/permissions";
import TopMenu from "../../../support/fragments/topMenu";
import SettingsPane from "../../../support/fragments/settings/settingsPane";
import JobProfiles from "../../../support/fragments/settings/data-export/jobProfiles";
import getRandomPostfix from "../../../support/utils/stringTools";
import Users from "../../../support/fragments/users/users";
import FieldMappingProfiles from "../../../support/fragments/settings/data-export/fieldMappingProfiles";
import InteractorsTools from "../../../support/utils/interactorsTools";

let user;
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

    FieldMappingProfiles.goTofieldMappingProfilesTab();
    FieldMappingProfiles.createNewFieldMappingProfile(fieldMappingProfileName, 'Holdings');
    FieldMappingProfiles.searchText('Holdings');
    FieldMappingProfiles.clickNthCheckbox();
    FieldMappingProfiles.fillInTransformationsTextfields('456', '1', '2', '$a');
    FieldMappingProfiles.clickTransformationsSaveAndCloseButton();
    FieldMappingProfiles.clickNewFieldMappingProfileSaveAndCloseButton();
    // Need to wait until the job is created
    cy.wait(2000);
  });

  after('delete user', () => {
    Users.deleteViaApi(user.userId);
  });

  it('C10953 Create a new job profile', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
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
