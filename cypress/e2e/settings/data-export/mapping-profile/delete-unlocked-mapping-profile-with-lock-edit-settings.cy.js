import permissions from '../../../../support/dictionary/permissions';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import SingleFieldMappingProfilePane from '../../../../support/fragments/data-export/exportMappingProfile/singleFieldMappingProfilePane';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import SingleJobProfile from '../../../../support/fragments/data-export/exportJobProfile/singleJobProfile';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

let user;
let notReferencedMappingProfileId;
let referencedMappingProfileId;
let jobProfileId;
const notReferencedMappingProfileName = getTestEntityValue('C1046010_NotRefMappingProfile');
const referencedMappingProfileName = getTestEntityValue('C1046010_RefMappingProfile');
const jobProfileName = getTestEntityValue('C1046010_JobProfile');

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportLockUnlockProfiles.gui]).then((userProperties) => {
        user = userProperties;

        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          notReferencedMappingProfileName,
        ).then((response) => {
          notReferencedMappingProfileId = response.body.id;
        });

        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          referencedMappingProfileName,
        ).then((response) => {
          referencedMappingProfileId = response.body.id;

          ExportNewJobProfile.createNewJobProfileViaApi(jobProfileName, response.body.id).then(
            (jobResponse) => {
              jobProfileId = jobResponse.body.id;
            },
          );
        });

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
        ExportFieldMappingProfiles.openTabFromDataExportSettingsList();
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      if (jobProfileId) {
        ExportJobProfiles.deleteJobProfileViaApi(jobProfileId);
      }
      if (notReferencedMappingProfileId) {
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(notReferencedMappingProfileId);
      }
      if (referencedMappingProfileId) {
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(referencedMappingProfileId);
      }
      Users.deleteViaApi(user.userId);
    });

    it(
      'C1046010 User with "Settings - UI-Data-Export Settings Lock - Edit" capability set is able to delete unlocked mapping profile not referenced in job profile (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C1046010'] },
      () => {
        // Step 1: Select existing unlocked mapping profile from Preconditions: mapping profile not referenced in job profile
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(notReferencedMappingProfileName);
        SingleFieldMappingProfilePane.waitLoading(notReferencedMappingProfileName);
        SingleFieldMappingProfilePane.verifyElements();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);
        SingleFieldMappingProfilePane.verifyActionOptions();

        // Step 2: Click on Actions menu => Delete option
        SingleFieldMappingProfilePane.clickDeleteButton();
        SingleFieldMappingProfilePane.verifyDeleteMappingProfileModal(
          notReferencedMappingProfileName,
        );

        // Step 3: Click "Cancel" button
        SingleFieldMappingProfilePane.clickCancelButton();
        SingleFieldMappingProfilePane.verifyDeleteMappingProfileModalClosed();
        SingleFieldMappingProfilePane.waitLoading(notReferencedMappingProfileName);
        SingleFieldMappingProfilePane.verifyElements();

        // Step 4: Click "Actions" menu button => Click "Delete" button => Click "Delete" button in appeared modal
        SingleFieldMappingProfilePane.openActions();
        SingleFieldMappingProfilePane.clickDeleteButton();
        SingleFieldMappingProfilePane.confirmDeletion();
        SingleFieldMappingProfilePane.verifyDeleteMappingProfileModalClosed();
        InteractorsTools.checkCalloutMessage(
          `Mapping profile ${notReferencedMappingProfileName} has been successfully deleted`,
        );
        ExportFieldMappingProfiles.verifyProfileNotInList(notReferencedMappingProfileName);
        notReferencedMappingProfileId = null;

        // Step 5: Select existing unlocked mapping profile from Preconditions: mapping profile referenced in job profile(s)
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(referencedMappingProfileName);
        SingleFieldMappingProfilePane.waitLoading(referencedMappingProfileName);
        SingleFieldMappingProfilePane.verifyElements();
        SingleFieldMappingProfilePane.verifyLockProfileCheckbox(false, true);

        // Step 6: Click on Actions menu => Delete option
        SingleFieldMappingProfilePane.openActions();
        SingleFieldMappingProfilePane.clickDeleteButton();
        SingleFieldMappingProfilePane.verifyCannotDeleteModalOpened();
        SingleFieldMappingProfilePane.verifyCannotDeleteModalMessage([jobProfileName]);

        // Step 7: Click "Close" button
        SingleFieldMappingProfilePane.closeCannotDeleteModal();
        SingleFieldMappingProfilePane.verifyCannotDeleteModalClosed();
        SingleFieldMappingProfilePane.waitLoading(referencedMappingProfileName);

        // Step 8: Close mapping profile view form => Go to "Job profiles" => Delete all job profiles that mapping profile is referenced to
        SingleFieldMappingProfilePane.clickXButton();
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.clickProfileNameFromTheList(jobProfileName);
        SingleJobProfile.waitLoading(jobProfileName);
        SingleJobProfile.openActions();
        SingleJobProfile.clickDeleteButton();
        SingleJobProfile.confirmDeletion();
        InteractorsTools.checkCalloutMessage(
          `Job profile ${jobProfileName} has been successfully deleted`,
        );
        jobProfileId = null;

        // Step 9: Go to "Field mapping profiles" => Select mapping profile for which all referenced job profiles were deleted => Click "Delete" button => Click "Delete" button in appeared modal
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(referencedMappingProfileName);
        SingleFieldMappingProfilePane.waitLoading(referencedMappingProfileName);
        SingleFieldMappingProfilePane.openActions();
        SingleFieldMappingProfilePane.clickDeleteButton();
        SingleFieldMappingProfilePane.confirmDeletion();
        InteractorsTools.checkCalloutMessage(
          `Mapping profile ${referencedMappingProfileName} has been successfully deleted`,
        );
        ExportFieldMappingProfiles.searchFieldMappingProfile(referencedMappingProfileName);
        ExportFieldMappingProfiles.verifyProfileNotInList(referencedMappingProfileName);
        referencedMappingProfileId = null;
      },
    );
  });
});
