import permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import SingleJobProfile from '../../../../support/fragments/data-export/exportJobProfile/singleJobProfile';
import SettingsDataExport from '../../../../support/fragments/data-export/settingsDataExport';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';

let user;
let instanceId;

const notReferencedJobProfile = {
  mappingProfileName: getTestEntityValue('C1030053_NotRefMappingProfile'),
  jobProfileName: getTestEntityValue('C1030053_NotRefJobProfile'),
  mappingProfileId: null,
  jobProfileId: null,
};

const referencedJobProfile = {
  mappingProfileName: getTestEntityValue('C1030053_RefMappingProfile'),
  jobProfileName: getTestEntityValue('C1030053_RefJobProfile'),
  mappingProfileId: null,
  jobProfileId: null,
};

const folioInstanceTitle = `AT_C1030053_FolioInstance${getRandomPostfix()}`;
const csvFileName = `AT_C1030053_instance_${getRandomPostfix()}.csv`;

describe('Data Export', () => {
  describe('Job profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
          user = userProperties;

          ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
            notReferencedJobProfile.mappingProfileName,
          ).then((response) => {
            notReferencedJobProfile.mappingProfileId = response.body.id;

            ExportNewJobProfile.createNewJobProfileViaApi(
              notReferencedJobProfile.jobProfileName,
              response.body.id,
            ).then((jobResponse) => {
              notReferencedJobProfile.jobProfileId = jobResponse.body.id;
            });
          });

          ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
            referencedJobProfile.mappingProfileName,
          ).then((response) => {
            referencedJobProfile.mappingProfileId = response.body.id;

            ExportNewJobProfile.createNewJobProfileViaApi(
              referencedJobProfile.jobProfileName,
              response.body.id,
            ).then((jobResponse) => {
              referencedJobProfile.jobProfileId = jobResponse.body.id;

              cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    title: folioInstanceTitle,
                    instanceTypeId: instanceTypeData[0].id,
                  },
                }).then((createdInstanceData) => {
                  instanceId = createdInstanceData.instanceId;

                  FileManager.createFile(`cypress/fixtures/${csvFileName}`, instanceId);

                  ExportFile.exportFileViaApi(
                    csvFileName,
                    'instance',
                    referencedJobProfile.jobProfileName,
                  );
                });
              });
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(
        notReferencedJobProfile.mappingProfileId,
      );
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(
        referencedJobProfile.mappingProfileId,
      );
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
    });

    it(
      'C1030053 User with "Settings - UI-Data-Export Settings - Edit" capability set is able to delete unlocked job profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C1030053'] },
      () => {
        // Step 1: Select existing unlocked job profile from Preconditions: job profile not referenced in an existing export job
        SettingsDataExport.goToSettingsDataExport();
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.clickProfileNameFromTheList(notReferencedJobProfile.jobProfileName);
        SingleJobProfile.waitLoading(notReferencedJobProfile.jobProfileName);
        SingleJobProfile.verifyElements();
        SingleJobProfile.verifyLockProfileCheckbox(false, true);

        // Step 2: Click on Actions menu => Delete option
        SingleJobProfile.openActions();
        SingleJobProfile.clickDeleteButton();
        SingleJobProfile.verifyDeleteJobProfileModal(notReferencedJobProfile.jobProfileName, false);

        // Step 3: Click "Cancel" button
        SingleJobProfile.clickCancelInDeleteModal();
        SingleJobProfile.verifyDeleteModalClosed();
        SingleJobProfile.waitLoading(notReferencedJobProfile.jobProfileName);
        SingleJobProfile.verifyElements();

        // Step 4: Click "Actions" menu button => Click "Delete" button => Click "Delete" button in appeared modal
        SingleJobProfile.openActions();
        SingleJobProfile.clickDeleteButton();
        SingleJobProfile.verifyDeleteModalOpen();
        SingleJobProfile.confirmDeletion();
        InteractorsTools.checkCalloutMessage(
          `Job profile ${notReferencedJobProfile.jobProfileName} has been successfully deleted`,
        );
        ExportJobProfiles.waitLoading();
        SingleJobProfile.verifyDeleteModalClosed();

        // Step 5: Click "Field mapping profiles" in "Data export" pane => Verify mapping profile associated with deleted job profile is present on the list of mapping profiles
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        ExportFieldMappingProfiles.verifyProfileNameOnTheList(
          notReferencedJobProfile.mappingProfileName,
        );

        // Step 6: Click "Job profiles" in "Data export" pane => Select existing unlocked job profile from Preconditions: job profile referenced in an existing export job
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.clickProfileNameFromTheList(referencedJobProfile.jobProfileName);
        SingleJobProfile.waitLoading(referencedJobProfile.jobProfileName);
        SingleJobProfile.verifyElements();
        SingleJobProfile.verifyLockProfileCheckbox(false, true);

        // Step 7: Click on Actions menu => Delete option
        SingleJobProfile.openActions();
        SingleJobProfile.verifyActionsMenuOptions();
        SingleJobProfile.clickDeleteButton();
        SingleJobProfile.verifyDeleteJobProfileModal(referencedJobProfile.jobProfileName, true);

        // Step 8: Click "Cancel" button
        SingleJobProfile.clickCancelInDeleteModal();
        SingleJobProfile.verifyDeleteModalClosed();
        SingleJobProfile.waitLoading(referencedJobProfile.jobProfileName);
        SingleJobProfile.verifyElements();

        // Step 9: Click "Actions" menu button => Click "Delete" button => Click "Delete" button in appeared modal
        SingleJobProfile.openActions();
        SingleJobProfile.clickDeleteButton();
        SingleJobProfile.verifyDeleteModalOpen();
        SingleJobProfile.confirmDeletion();
        InteractorsTools.checkCalloutMessage(
          `Job profile ${referencedJobProfile.jobProfileName} has been successfully deleted`,
        );
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.verifyJobProfileAbsentInTheTable();
        SingleJobProfile.verifyDeleteModalClosed();

        // Step 10: Click "Field mapping profiles" in "Data export" pane => Verify mapping profile associated with deleted job profile is present on the list of mapping profiles
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        ExportFieldMappingProfiles.verifyProfileNameOnTheList(
          referencedJobProfile.mappingProfileName,
        );
      },
    );
  });
});
