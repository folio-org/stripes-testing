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
let fieldMappingProfileId;
let firstJobProfileId;
let secondJobProfileId;
const mappingProfileName = getTestEntityValue('C15825_mappingProfile');
const firstJobProfileName = getTestEntityValue('C15825_firstJobProfile');
const secondJobProfileName = getTestEntityValue('C15825_secondJobProfile');
const firstJobProfileNameEdited = getTestEntityValue('C15825_firstJobProfile_edited');

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
          user = userProperties;

          ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(mappingProfileName).then(
            (response) => {
              fieldMappingProfileId = response.body.id;

              ExportNewJobProfile.createNewJobProfileViaApi(
                firstJobProfileName,
                response.body.id,
              ).then((jobResponse1) => {
                firstJobProfileId = jobResponse1.body.id;
              });

              ExportNewJobProfile.createNewJobProfileViaApi(
                secondJobProfileName,
                response.body.id,
              ).then((jobResponse2) => {
                secondJobProfileId = jobResponse2.body.id;
              });
            },
          );

          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
          ExportFieldMappingProfiles.openTabFromDataExportSettingsList();
          SingleFieldMappingProfilePane.clickProfileNameFromTheList(mappingProfileName);
          SingleFieldMappingProfilePane.waitLoading(mappingProfileName);
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      if (firstJobProfileId) {
        ExportJobProfiles.deleteJobProfileViaApi(firstJobProfileId);
      }
      if (secondJobProfileId) {
        ExportJobProfiles.deleteJobProfileViaApi(secondJobProfileId);
      }
      if (fieldMappingProfileId) {
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(fieldMappingProfileId);
      }
      Users.deleteViaApi(user.userId);
    });

    it(
      'C15825 User with "Settings - UI-Data-Export Settings - Edit" capability set is NOT able to delete unlocked mapping profile until it is referenced in job profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C15825'] },
      () => {
        // Step 1: Attempt to delete - verify modal appears with both job profiles
        SingleFieldMappingProfilePane.openActions();
        SingleFieldMappingProfilePane.clickDeleteButton();
        SingleFieldMappingProfilePane.verifyCannotDeleteModalOpened();
        SingleFieldMappingProfilePane.verifyCannotDeleteModalMessage([
          firstJobProfileName,
          secondJobProfileName,
        ]);

        // Step 2: Navigate to Job profiles and edit first job profile name
        SingleFieldMappingProfilePane.closeCannotDeleteModal();
        SingleFieldMappingProfilePane.verifyCannotDeleteModalClosed();
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.clickProfileNameFromTheList(firstJobProfileName);
        SingleJobProfile.waitLoading(firstJobProfileName);
        SingleJobProfile.openActions();
        SingleJobProfile.clickEditButton();
        SingleJobProfile.editJobProfile(firstJobProfileNameEdited);
        SingleJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(
          `Job profile ${firstJobProfileNameEdited} has been successfully edited`,
        );

        // Step 3: Go back to mapping profile and verify modal shows edited job profile name
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(mappingProfileName);
        SingleFieldMappingProfilePane.waitLoading(mappingProfileName);
        SingleFieldMappingProfilePane.openActions();
        SingleFieldMappingProfilePane.clickDeleteButton();
        SingleFieldMappingProfilePane.verifyCannotDeleteModalOpened();
        SingleFieldMappingProfilePane.verifyCannotDeleteModalMessage(
          [firstJobProfileNameEdited, secondJobProfileName],
          [firstJobProfileName],
        );

        // Step 4: Delete first job profile
        SingleFieldMappingProfilePane.closeCannotDeleteModal();
        SingleFieldMappingProfilePane.verifyCannotDeleteModalClosed();
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.clickProfileNameFromTheList(firstJobProfileNameEdited);
        SingleJobProfile.waitLoading(firstJobProfileNameEdited);
        SingleJobProfile.openActions();
        SingleJobProfile.clickDeleteButton();
        SingleJobProfile.confirmDeletion();
        InteractorsTools.checkCalloutMessage(
          `Job profile ${firstJobProfileNameEdited} has been successfully deleted`,
        );
        firstJobProfileId = null; // Mark as deleted for cleanup

        // Step 5: Verify modal shows only remaining job profile
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(mappingProfileName);
        SingleFieldMappingProfilePane.waitLoading(mappingProfileName);
        SingleFieldMappingProfilePane.openActions();
        SingleFieldMappingProfilePane.clickDeleteButton();
        SingleFieldMappingProfilePane.verifyCannotDeleteModalOpened();
        SingleFieldMappingProfilePane.verifyCannotDeleteModalMessage(
          [secondJobProfileName],
          [firstJobProfileNameEdited, firstJobProfileName],
        );

        // Step 6: Delete second job profile
        SingleFieldMappingProfilePane.closeCannotDeleteModal();
        SingleFieldMappingProfilePane.verifyCannotDeleteModalClosed();
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.clickProfileNameFromTheList(secondJobProfileName);
        SingleJobProfile.waitLoading(secondJobProfileName);
        SingleJobProfile.openActions();
        SingleJobProfile.clickDeleteButton();
        SingleJobProfile.confirmDeletion();
        InteractorsTools.checkCalloutMessage(
          `Job profile ${secondJobProfileName} has been successfully deleted`,
        );
        secondJobProfileId = null; // Mark as deleted for cleanup

        // Step 7: Delete mapping profile successfully
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(mappingProfileName);
        SingleFieldMappingProfilePane.waitLoading(mappingProfileName);
        SingleFieldMappingProfilePane.openActions();
        SingleFieldMappingProfilePane.clickDeleteButton();
        SingleFieldMappingProfilePane.confirmDeletion();
        InteractorsTools.checkCalloutMessage(
          `Mapping profile ${mappingProfileName} has been successfully deleted`,
        );
        ExportFieldMappingProfiles.verifyProfileNotInList(mappingProfileName);
        fieldMappingProfileId = null; // Mark as deleted for cleanup
      },
    );
  });
});
