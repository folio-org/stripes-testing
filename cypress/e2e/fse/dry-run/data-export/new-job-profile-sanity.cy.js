import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

let fieldMappingProfileId;
const newJobProfileName = `AT_C10953_jobProfile${getRandomPostfix()}`;
const secondNewJobProfileName = `AT_C10953_secondJobProfile${getRandomPostfix()}`;
const fieldMappingProfileName = `AT_C10953_fieldMappingProfile${getRandomPostfix()}`;
const newJobProfileCalloutMessage = `Job profile ${newJobProfileName} has been successfully created`;
const secondNewJobProfileCalloutMessage = `Job profile ${secondNewJobProfileName} has been successfully created`;
const newJobProfileDescription = `Decription${getRandomPostfix()}`;

describe('Data Export', () => {
  describe('Job profiles', () => {
    before('create user, job and navigate to page', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password).then(() => {
        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          fieldMappingProfileName,
        ).then((response) => {
          fieldMappingProfileId = response.body.id;
        });
      });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    after('delete jobs and user', () => {
      cy.getUserToken(user.username, user.password);
      cy.setTenant(memberTenant.id);

      ExportJobProfiles.getJobProfile({ query: `"name"=="${newJobProfileName}"` }).then(
        (response) => {
          ExportJobProfiles.deleteJobProfileViaApi(response.id);
        },
      );
      ExportJobProfiles.getJobProfile({ query: `"name"=="${secondNewJobProfileName}"` }).then(
        (response) => {
          ExportJobProfiles.deleteJobProfileViaApi(response.id);
        },
      );
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(fieldMappingProfileId);
    });

    it(
      'C10953 Create a new job profile (firebird)',
      { tags: ['dryRun', 'firebird', 'C10953'] },
      () => {
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

        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(newJobProfileCalloutMessage);
        ExportJobProfiles.verifyJobProfileInTheTable(newJobProfileName);

        ExportJobProfiles.openNewJobProfileForm();
        ExportNewJobProfile.verifyNewJobProfileForm();

        ExportNewJobProfile.fillinDescription(newJobProfileDescription);
        ExportNewJobProfile.saveJobProfile();

        ExportNewJobProfile.verifyNameValidationError();
        ExportNewJobProfile.verifySelectMappingProfileValidationError();

        ExportNewJobProfile.fillinNameTextfield(secondNewJobProfileName);
        ExportNewJobProfile.selectMappingProfileFromDropdown(fieldMappingProfileName);
        ExportNewJobProfile.saveJobProfile();

        InteractorsTools.checkCalloutMessage(secondNewJobProfileCalloutMessage);
        ExportJobProfiles.verifyJobProfileInTheTable(secondNewJobProfileName);
      },
    );
  });
});
