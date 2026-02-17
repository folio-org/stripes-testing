import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe(
    'Importing MARC Bib files',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let user;
      let instanceHRID;
      const marcFilePath = 'oneMarcBib.mrc';
      const marcFileName = `C411579 autotestFile${getRandomPostfix()}.mrc`;
      const exportedFileName = `C411579 autotestExportedFile${getRandomPostfix()}.mrc`;
      const updatedMarcFileName = `C411579 autotestFileForUpdate${getRandomPostfix()}.mrc`;

      // profiles for create
      const mappingProfile = {
        name: `C411579 autotest mapping profile for create${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      };

      const actionProfile = {
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C411579 autotest action profile for create${getRandomPostfix()}`,
      };

      const jobProfile = {
        profileName: `C411579 autotest job profile for create${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      // profiles for update
      const matchProfile = {
        profileName: `C411579 autotest match profile${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '999',
          in1: 'f',
          in2: 'f',
          subfield: 's',
        },
        existingRecordFields: {
          field: '999',
          in1: 'f',
          in2: 'f',
          subfield: 's',
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      };

      const mappingProfileForUpdate = {
        name: `C411579 autotest mapping profile for update${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.CATALOGED,
      };

      const actionProfileForUpdate = {
        name: `C411579 autotest action profile for update${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
      };

      const jobProfileForUpdate = {
        profileName: `C411579 autotest job profile for update${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      beforeEach('Create test user and login', () => {
        cy.createTempUser([
          Permissions.dataImportUploadAll.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.settingsDataImportEnabled.gui,
          Permissions.inventoryAll.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          Permissions.dataExportViewAddUpdateProfiles.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: SettingsMenu.mappingProfilePath,
            waiter: FieldMappingProfiles.waitLoading,
          });
        });
      });

      afterEach('Delete test data', () => {
        // delete created files in fixtures
        FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
        FileManager.deleteFileFromDownloadsByMask(`*${exportedFileName}`);
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(user.userId);
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
          SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
          SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileForUpdate.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            mappingProfileForUpdate.name,
          );
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
            (instance) => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
        });
      });

      it(
        'C411579 MARC file import with matching for 999 ff field (folijet)',
        { tags: ['criticalPath', 'folijet', 'C411579'] },
        () => {
          FieldMappingProfiles.createInstanceMappingProfile(mappingProfile);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          SettingsActionProfiles.create(actionProfile, mappingProfile.name);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.createJobProfile(jobProfile);
          NewJobProfile.linkActionProfile(actionProfile);
          NewJobProfile.saveAndClose();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.verifyUploadState();
          DataImport.uploadFile(marcFilePath, marcFileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(marcFileName);
          Logs.openFileDetails(marcFileName);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.CREATED,
            FileDetails.columnNameInResultList.instance,
          );
          FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            instanceHRID = initialInstanceHrId;
          });

          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.exportInstanceMarc();
          cy.intercept('/data-export/quick-export').as('getHrid');
          cy.wait('@getHrid', getLongDelay()).then((req) => {
            const expectedRecordHrid = req.response.body.jobExecutionHrId;

            // download exported marc file
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            ExportFile.downloadExportedMarcFileWithRecordHrid(expectedRecordHrid, exportedFileName);
            FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
          });
          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            APPLICATION_NAMES.DATA_IMPORT,
          );
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfileForUpdate);
          NewFieldMappingProfile.fillInstanceStatusTerm(mappingProfileForUpdate.instanceStatusTerm);
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(mappingProfileForUpdate.name);
          FieldMappingProfiles.checkMappingProfilePresented(mappingProfileForUpdate.name);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          SettingsActionProfiles.create(actionProfileForUpdate, mappingProfileForUpdate.name);
          SettingsActionProfiles.checkActionProfilePresented(actionProfileForUpdate.name);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
          MatchProfiles.createMatchProfile(matchProfile);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.createJobProfileWithLinkingProfiles(
            jobProfileForUpdate,
            actionProfileForUpdate.name,
            matchProfile.profileName,
          );
          JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          DataImport.verifyUploadState();
          DataImport.uploadFile(exportedFileName, updatedMarcFileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfileForUpdate.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(updatedMarcFileName);
          Logs.openFileDetails(updatedMarcFileName);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.instance,
          );
          FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
          InstanceRecordView.verifyInstancePaneExists();
          cy.wait(3000);
          InstanceRecordView.verifyInstanceStatusTerm(INSTANCE_STATUS_TERM_NAMES.CATALOGED);
        },
      );
    },
  );
});
