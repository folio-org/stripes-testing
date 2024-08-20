import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
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
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
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

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.dataImportUploadAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.dataExportEnableModule.gui,
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

    after('Delete test data', () => {
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
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileForUpdate.name);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C411579 MARC file import with matching for 999 ff field (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        FieldMappingProfiles.createInstanceMappingProfile(mappingProfile);

        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(actionProfile);
        NewJobProfile.saveAndClose();

        cy.visit(TopMenu.dataImportPath);
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
          cy.visit(TopMenu.dataExportPath);
          ExportFile.downloadExportedMarcFileWithRecordHrid(expectedRecordHrid, exportedFileName);
          FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
        });
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfileForUpdate);
        NewFieldMappingProfile.fillInstanceStatusTerm(mappingProfileForUpdate.instanceStatusTerm);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfileForUpdate.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfileForUpdate.name);

        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfileForUpdate, mappingProfileForUpdate.name);
        ActionProfiles.checkActionProfilePresented(actionProfileForUpdate.name);

        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfileForUpdate,
          actionProfileForUpdate.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

        cy.visit(TopMenu.dataImportPath);
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
        InstanceRecordView.verifyInstanceStatusTerm(INSTANCE_STATUS_TERM_NAMES.CATALOGED);
      },
    );
  });
});
