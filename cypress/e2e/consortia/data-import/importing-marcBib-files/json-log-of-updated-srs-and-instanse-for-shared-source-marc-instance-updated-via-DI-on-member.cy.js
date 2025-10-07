import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import MatchProfiles from '../../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    describe('Consortia', () => {
      const testData = {
        instanceTitle:
          'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)',
        marcFile: {
          marc: 'oneMarcBib.mrc',
          fileName: `C417045 testMarcFile${getRandomPostfix()}.mrc`,
          exportedFileName: `C417045 exportedTestMarcFile${getRandomPostfix()}.mrc`,
          modifiedMarcFile: `C417045 modifiedTestMarcFile${getRandomPostfix()}.mrc`,
          editedMarcFile: `C417045 editedTestMarcFile${getRandomPostfix()}.mrc`,
        },
      };
      const mappingProfile = {
        name: `C417045 Update shared Instance using marc-to-marc${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        update: true,
      };
      const actionProfile = {
        typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        name: `C417045 Update shared Instance using marc-to-marc${getRandomPostfix()}`,
        action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
      };
      const matchProfile = {
        profileName: `C417045 001-to-001 marc bib match${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '001',
        },
        existingRecordFields: {
          field: '001',
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      };
      const jobProfile = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `C417045 001-to-001 marc bib match for update marc${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;

          cy.setTenant(Affiliations.College);
          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          ).then((response) => {
            testData.sharedInstanceId = response[0].instance.id;

            InventoryInstance.shareInstanceViaApi(
              testData.sharedInstanceId,
              testData.consortiaId,
              Affiliations.College,
              Affiliations.Consortia,
            );
          });
          cy.resetTenant();
        });

        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.inventoryAll.gui,
            Permissions.moduleDataImportEnabled.gui,
            Permissions.settingsDataImportEnabled.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ]);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
      });

      after('Delete test data', () => {
        // delete created files
        FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.exportedFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.modifiedMarcFile}`);
        FileManager.deleteFile(`cypress/downloads/${testData.marcFile.exportedFileName}`);
        cy.resetTenant();
        cy.getAdminToken().then(() => {
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
          SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.sharedInstanceId);
        });
      });

      it(
        'C417045 (CONSORTIA) Verify the JSON log of the updated SRS and Instance for shared Source = MARC Instance updated via import on member tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C417045'] },
        () => {
          const updatedInstanceTitle = `${testData.instanceTitle} modified`;

          InventoryInstances.searchByTitle(testData.sharedInstanceId);
          InventorySearchAndFilter.closeInstanceDetailPane();
          InventorySearchAndFilter.selectResultCheckboxes(1);
          InventorySearchAndFilter.verifySelectedRecords(1);
          InventorySearchAndFilter.exportInstanceAsMarc();
          cy.setTenant(Affiliations.College);
          cy.intercept('/data-export/quick-export').as('getHrid');
          cy.wait('@getHrid', getLongDelay()).then((req) => {
            const expectedRecordHrid = req.response.body.jobExecutionHrId;

            // download exported marc file
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            ExportFile.waitLandingPageOpened();
            ExportFile.downloadExportedMarcFileWithRecordHrid(
              expectedRecordHrid,
              testData.marcFile.exportedFileName,
            );
            FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
          });
          cy.resetTenant();

          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            APPLICATION_NAMES.DATA_IMPORT,
          );
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
          FieldMappingProfiles.createMappingProfileForUpdatesMarc(mappingProfile);
          FieldMappingProfileView.closeViewMode(mappingProfile.name);
          FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          SettingsActionProfiles.create(actionProfile, mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
          MatchProfiles.createMatchProfile(matchProfile);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.createJobProfileWithLinkingProfiles(
            jobProfile,
            actionProfile.name,
            matchProfile.profileName,
          );
          JobProfiles.checkJobProfilePresented(jobProfile.profileName);

          // change exported file
          DataImport.editMarcFile(
            testData.marcFile.exportedFileName,
            testData.marcFile.modifiedMarcFile,
            [testData.instanceTitle],
            [updatedInstanceTitle],
          );

          // upload the exported and edited marc file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.verifyUploadState();
          DataImport.uploadFile(
            testData.marcFile.modifiedMarcFile,
            testData.marcFile.editedMarcFile,
          );
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImportedForConsortia(testData.marcFile.editedMarcFile);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(testData.marcFile.editedMarcFile);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.instance,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
          });
          FileDetails.openJsonScreen(updatedInstanceTitle);
          JsonScreenView.verifyJsonScreenIsOpened();
          JsonScreenView.openMarcSrsTab();
          JsonScreenView.verifyContentInTab(updatedInstanceTitle);
          JsonScreenView.openInstanceTab();
          JsonScreenView.verifyContentInTab(updatedInstanceTitle);
        },
      );
    });
  });
});
