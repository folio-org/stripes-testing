import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView, {
  actionsMenuOptions,
} from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Set record for deletion', () => {
    const testData = {};
    const textForUpdateInMarcFile = '01205dam';
    const marcFile = {
      marc: 'marcBibFileForC663275.mrc',
      fileName: `C663275 testMarcFile${getRandomPostfix()}.mrc`,
      exportedFileName: `C663275 exportedMarcFile${getRandomPostfix()}.mrc`,
      modifiedMarcFile: `C663275 modifiedMarcFile${getRandomPostfix()}.mrc`,
      marcFileName: `C663275 marcFile${getRandomPostfix()}.mrc`,
    };
    const mappingProfile = {
      name: `C663275 Update LEADER 05${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      update: true,
    };
    const actionProfile = {
      name: `C663275 Update LEADER 05${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
      folioRecordType: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const matchProfile = {
      profileName: `C663275 001-to-001 match${getRandomPostfix()}`,
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
      profileName: `C663275 001 to 001 match for Update LEADER 05${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        marcFile.marc,
        marcFile.fileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        testData.instanceId = response[0].instance.id;
      });

      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventorySetRecordsForDeletion.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchByTitle(testData.instanceId);
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${marcFile.exportedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${marcFile.modifiedMarcFile}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });
    });

    it(
      'C663275 Record becomes "Set for deletion" after updating Leader 05 to "d" (folijet)',
      { tags: ['criticalPath', 'folijet', 'C663275'] },
      () => {
        InstanceRecordView.exportInstanceMarc();
        cy.visit(TopMenu.dataExportPath);
        cy.wait(1000);
        ExportFile.getExportedFileNameViaApi().then((name) => {
          testData.fileName = name;

          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
          cy.wait(4000);
          ExportFile.downloadExportedMarcFile(marcFile.exportedFileName);

          DataImport.editMarcFile(
            marcFile.exportedFileName,
            marcFile.modifiedMarcFile,
            ['01205cam'],
            [textForUpdateInMarcFile],
          );
          FileManager.deleteFile(`cypress/downloads/${marcFile.exportedFileName}`);
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
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

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(marcFile.modifiedMarcFile, marcFile.marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImportedForConsortia(marcFile.marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.marcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyInstanceIsSetForDeletionSuppressedFromDiscoveryStaffSuppressedWarning();
        InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery();
        InstanceRecordView.verifyInstanceIsMarkedAsStaffSuppressed();
        InstanceRecordView.verifyInstanceIsSetForDeletion();
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.setRecordForDeletion,
          false,
        );
        InstanceRecordView.clickActionsButton();
        InstanceRecordView.viewSource();
        InventoryViewSource.contains(textForUpdateInMarcFile);
      },
    );
  });
});
