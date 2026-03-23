import permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import SingleJobProfile from '../../../../support/fragments/data-export/exportJobProfile/singleJobProfile';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import SettingsDataExport from '../../../../support/fragments/data-export/settingsDataExport';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';
import { DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES } from '../../../../support/constants';

let user;
let instanceId;

const lockedNotReferencedJobProfile = {
  mappingProfileName: getTestEntityValue('C1003543_LockedNotRefMappingProfile'),
  jobProfileName: getTestEntityValue('C1003543_LockedNotRefJobProfile'),
  duplicatedJobProfileName: getTestEntityValue('C1003543_DuplicatedLockedNotRef'),
  description: getTestEntityValue('C1003543_Description1'),
  mappingProfileId: null,
  jobProfileId: null,
};

const lockedReferencedJobProfile = {
  mappingProfileName: getTestEntityValue('C1003543_LockedRefMappingProfile'),
  jobProfileName: getTestEntityValue('C1003543_LockedRefJobProfile'),
  duplicatedJobProfileName: getTestEntityValue('C1003543_DuplicatedLockedRef'),
  description: getTestEntityValue('C1003543_Description2'),
  mappingProfileId: null,
  jobProfileId: null,
};

const defaultJobProfile = {
  jobProfileName: DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.HOLDINGS,
  duplicatedJobProfileName: getTestEntityValue('C1003543_DuplicatedDefaultProfile'),
  description: getTestEntityValue('C1003543_Description3'),
  mappingProfileName: 'Default holdings mapping profile',
};

const folioInstanceTitle = `AT_C1003543_FolioInstance_${getRandomPostfix()}`;
const csvFileName = `AT_C1003543_instance_${getRandomPostfix()}.csv`;

describe('Data Export', () => {
  describe('Job profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
          user = userProperties;

          ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
            lockedNotReferencedJobProfile.mappingProfileName,
          ).then((response) => {
            lockedNotReferencedJobProfile.mappingProfileId = response.body.id;

            ExportNewJobProfile.createNewJobProfileViaApi(
              lockedNotReferencedJobProfile.jobProfileName,
              response.body.id,
              true,
            ).then((jobResponse) => {
              lockedNotReferencedJobProfile.jobProfileId = jobResponse.body.id;
            });
          });

          ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
            lockedReferencedJobProfile.mappingProfileName,
          ).then((response) => {
            lockedReferencedJobProfile.mappingProfileId = response.body.id;

            ExportNewJobProfile.createNewJobProfileViaApi(
              lockedReferencedJobProfile.jobProfileName,
              response.body.id,
              true,
            ).then((jobResponse) => {
              lockedReferencedJobProfile.jobProfileId = jobResponse.body.id;

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
                    lockedReferencedJobProfile.jobProfileName,
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

      [
        lockedNotReferencedJobProfile.duplicatedJobProfileName,
        lockedReferencedJobProfile.duplicatedJobProfileName,
        defaultJobProfile.duplicatedJobProfileName,
      ].forEach((name) => {
        ExportJobProfiles.getJobProfile({ query: `"name"=="${name}"` }).then((response) => {
          if (response) {
            ExportJobProfiles.deleteJobProfileViaApi(response.id);
          }
        });
      });

      [lockedNotReferencedJobProfile.jobProfileId, lockedReferencedJobProfile.jobProfileId].forEach(
        (id) => {
          cy.getDataExportJobProfile({ query: `"id"=="${id}"` }).then((profile) => {
            profile.locked = false;
            cy.updateDataExportJobProfile(id, profile);
          });
          ExportJobProfiles.deleteJobProfileViaApi(id);
        },
      );

      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(
        lockedNotReferencedJobProfile.mappingProfileId,
      );
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(
        lockedReferencedJobProfile.mappingProfileId,
      );
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
    });

    it(
      'C1003543 User with "Settings - UI-Data-Export Settings - Edit" capability set is able to duplicate locked and default job profiles (firebird)',
      { tags: ['extendedPath', 'firebird', 'C1003543'] },
      () => {
        // Step 1: Select existing locked job profile from Preconditions: job profile not referenced in an existing export job
        SettingsDataExport.goToSettingsDataExport();
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.searchJobProfile(lockedNotReferencedJobProfile.jobProfileName);
        ExportJobProfiles.clickProfileNameFromTheList(lockedNotReferencedJobProfile.jobProfileName);
        SingleJobProfile.waitLoading(lockedNotReferencedJobProfile.jobProfileName);
        SingleJobProfile.verifyElements();
        SingleJobProfile.verifyLockProfileCheckbox(true, true);

        // Step 2: Click "Actions" menu button
        SingleJobProfile.openActions();
        SingleJobProfile.verifyActionsMenuItems({ edit: false, duplicate: true, delete: false });

        // Step 3: Click on Actions menu => Duplicate option
        SingleJobProfile.clickDuplicateButton();
        ExportNewJobProfile.verifyNewJobProfileForm();
        SingleJobProfile.verifyProfileFieldsValues(
          `Copy of ${lockedNotReferencedJobProfile.jobProfileName}`,
          lockedNotReferencedJobProfile.mappingProfileName,
          '',
        );
        SingleJobProfile.verifyLockProfileCheckbox(false, true);
        SettingsDataExport.verifyPageTitle('Data export settings - New job profile - FOLIO');

        // Step 4: Make changes to the Name, Mapping profile or Description from job profile form, Click "Save & close" button
        SingleJobProfile.editJobProfile(lockedNotReferencedJobProfile.duplicatedJobProfileName);
        ExportNewJobProfile.fillinDescription(lockedNotReferencedJobProfile.description);
        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(
          `Job profile ${lockedNotReferencedJobProfile.duplicatedJobProfileName} has been successfully created`,
        );

        // Step 5: Verify row with duplicated job profile in "Job profiles" table
        ExportJobProfiles.searchJobProfile(lockedNotReferencedJobProfile.duplicatedJobProfileName);
        ExportJobProfiles.verifyProfileInTable(
          lockedNotReferencedJobProfile.duplicatedJobProfileName,
          user,
        );

        // Step 6: Click on the row with duplicated job profile
        ExportJobProfiles.searchJobProfile(lockedNotReferencedJobProfile.duplicatedJobProfileName);
        ExportJobProfiles.clickProfileNameFromTheList(
          lockedNotReferencedJobProfile.duplicatedJobProfileName,
        );
        SingleJobProfile.waitLoading(lockedNotReferencedJobProfile.duplicatedJobProfileName);
        SingleJobProfile.verifyViewProfileDetails(
          lockedNotReferencedJobProfile.duplicatedJobProfileName,
          lockedNotReferencedJobProfile.mappingProfileName,
          lockedNotReferencedJobProfile.description,
        );

        // Step 7: Select existing locked job profile from Preconditions: job profile referenced in an existing export job
        ExportJobProfiles.searchJobProfile(lockedReferencedJobProfile.jobProfileName);
        ExportJobProfiles.clickProfileNameFromTheList(lockedReferencedJobProfile.jobProfileName);
        SingleJobProfile.waitLoading(lockedReferencedJobProfile.jobProfileName);
        SingleJobProfile.verifyElements();
        SingleJobProfile.verifyLockProfileCheckbox(true, true);

        // Step 8: Click "Actions" menu button
        SingleJobProfile.openActions();
        SingleJobProfile.verifyActionsMenuItems({ edit: false, duplicate: true, delete: false });

        // Step 9: Click on Actions menu => Duplicate option, Make changes to the Name, Mapping profile or Description from job profile form, Click "Save & close" button
        SingleJobProfile.clickDuplicateButton();
        SingleJobProfile.editJobProfile(lockedReferencedJobProfile.duplicatedJobProfileName);
        ExportNewJobProfile.fillinDescription(lockedReferencedJobProfile.description);
        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(
          `Job profile ${lockedReferencedJobProfile.duplicatedJobProfileName} has been successfully created`,
        );

        // Step 10: Verify row with duplicated job profile in "Job profiles" table
        ExportJobProfiles.searchJobProfile(lockedReferencedJobProfile.duplicatedJobProfileName);
        ExportJobProfiles.verifyProfileInTable(
          lockedReferencedJobProfile.duplicatedJobProfileName,
          user,
        );

        // Step 11: Click on the row with duplicated job profile
        ExportJobProfiles.searchJobProfile(lockedReferencedJobProfile.duplicatedJobProfileName);
        ExportJobProfiles.clickProfileNameFromTheList(
          lockedReferencedJobProfile.duplicatedJobProfileName,
        );
        SingleJobProfile.waitLoading(lockedReferencedJobProfile.duplicatedJobProfileName);
        SingleJobProfile.verifyViewProfileDetails(
          lockedReferencedJobProfile.duplicatedJobProfileName,
          lockedReferencedJobProfile.mappingProfileName,
          lockedReferencedJobProfile.description,
        );

        // Step 12: Select existing job profile from Preconditions: default job profile
        ExportJobProfiles.searchJobProfile(defaultJobProfile.jobProfileName);
        ExportJobProfiles.clickProfileNameFromTheList(defaultJobProfile.jobProfileName);
        SingleJobProfile.waitLoading(defaultJobProfile.jobProfileName);
        SingleJobProfile.verifyElements();
        SingleJobProfile.verifyLockProfileCheckbox(false, true);

        // Step 13: Click "Actions" menu button
        SingleJobProfile.openActions();
        SingleJobProfile.verifyActionsMenuItems({ edit: false, duplicate: true, delete: false });

        // Step 14: Click on Actions menu => Duplicate option, Make changes to the Name, Mapping profile or Description from job profile form, Click "Save & close" button
        SingleJobProfile.clickDuplicateButton();
        SingleJobProfile.editJobProfile(defaultJobProfile.duplicatedJobProfileName);
        ExportNewJobProfile.fillinDescription(defaultJobProfile.description);
        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(
          `Job profile ${defaultJobProfile.duplicatedJobProfileName} has been successfully created`,
        );

        // Step 15: Verify row with duplicated job profile in "Job profiles" table
        ExportJobProfiles.searchJobProfile(defaultJobProfile.duplicatedJobProfileName);
        ExportJobProfiles.verifyProfileInTable(defaultJobProfile.duplicatedJobProfileName, user);

        // Step 16: Click on the row with duplicated job profile
        ExportJobProfiles.searchJobProfile(defaultJobProfile.duplicatedJobProfileName);
        ExportJobProfiles.clickProfileNameFromTheList(defaultJobProfile.duplicatedJobProfileName);
        SingleJobProfile.waitLoading(defaultJobProfile.duplicatedJobProfileName);
        SingleJobProfile.verifyViewProfileDetails(
          defaultJobProfile.duplicatedJobProfileName,
          defaultJobProfile.mappingProfileName,
          defaultJobProfile.description,
        );
        SingleJobProfile.verifyLockProfileCheckbox(false, true);

        // Step 17: In DevTools verify "default" value for duplicated job profile
        ExportJobProfiles.getJobProfile({
          query: `"name"=="${defaultJobProfile.duplicatedJobProfileName}"`,
        }).then((response) => {
          cy.wrap(response.default).should('equal', false);
        });
      },
    );
  });
});
