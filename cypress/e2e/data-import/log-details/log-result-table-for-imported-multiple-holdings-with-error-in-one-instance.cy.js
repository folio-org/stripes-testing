import {
  ACCEPTED_DATA_TYPE_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    const randomPostfix = getRandomPostfix();
    // The fixture's 245 $a title is static (not randomized)
    const instanceTitle = 'AT_C387507_MarcBibInstance';
    const holdingsFileName = 'marcBibFileForC387507.mrc';
    const editedMarcFileName = `AT_C387507_editedMarcFile_${randomPostfix}.mrc`;

    const mappingProfile = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `AT_C387507_MappingProfile_${randomPostfix}`,
      permanentLocation: '945$h',
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `AT_C387507_ActionProfile_${randomPostfix}`,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `AT_C387507_JobProfile_${randomPostfix}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    let user;
    let locationCode;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);

      cy.then(() => {
        // Replace the 1 placeholder with a real location code; "FakeAhhCode" stays invalid on purpose
        cy.getLocations({ limit: 1, query: '(name<>"AT_*" and name<>"*auto*")' }).then(
          (location) => {
            locationCode = location.code;
            DataImport.editMarcFile(
              holdingsFileName,
              editedMarcFileName,
              ['LOCCODE'],
              [locationCode],
            );
          },
        );
      }).then(() => {
        cy.createTempUser([
          Permissions.settingsDataImportEnabled.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: SettingsMenu.mappingProfilePath,
            waiter: FieldMappingProfiles.waitLoading,
          });

          // Steps 1-3: Create Holdings field mapping profile (Permanent location <- 945$h)
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
          NewFieldMappingProfile.fillPermanentLocation(mappingProfile.permanentLocation);
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(mappingProfile.name);

          // Steps 4-6: Create Holdings action profile linked to the mapping profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          SettingsActionProfiles.create(actionProfile, mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

          // Steps 7-9: Create job profile - "Default - Create instance" + our Holdings action profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.createJobProfile(jobProfile);
          NewJobProfile.linkActionProfileByName('Default - Create instance');
          NewJobProfile.linkActionProfile(actionProfile);
          NewJobProfile.saveAndClose();
          JobProfiles.checkJobProfilePresented(jobProfile.profileName);
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    });

    it(
      'C387507 Check the log result table for imported multiple holdings with error in one instance (promin)',
      { tags: ['extendedPath', 'promin', 'C387507'] },
      () => {
        const holdingsStatuses = [`Created (${locationCode})`, RECORD_STATUSES.NO_ACTION];

        // Steps 10-11: Upload the edited MARC bib file and run with the created job profile
        cy.visit(TopMenu.dataImportPath);
        DataImport.waitLoading();
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();

        // Step 12: Import completed with error
        Logs.waitFileIsImported(editedMarcFileName);
        Logs.checkJobStatus(editedMarcFileName, JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(editedMarcFileName);

        // Step 13: 1 SRS MARC, 1 Instance (hyperlink), 1 Holdings created + 1 "No action" (invalid location)
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.verifyMultipleHoldingsStatus(holdingsStatuses, 2);
      },
    );
  });
});
