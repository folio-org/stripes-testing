import {
  EXISTING_RECORD_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const postfix = getRandomPostfix();
    const instanceTitle = `AT_C407707_FolioInstance_${postfix}`;
    const csvFileName = `C407707_instanceIds_${postfix}.csv`;
    const exportedMarcFileName = `C407707_exported_${postfix}.mrc`;
    const administrativeNoteValue = `C407707 admin note ${postfix}`;
    const statusTermValue = INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED;

    const mappingProfileStatCode = { name: `C407707 Update instance stat code ${postfix}` };
    const mappingProfileAdminNote = { name: `C407707 Update Instance admin note ${postfix}` };
    const mappingProfileStatusTerm = { name: `C407707 Update instance status term ${postfix}` };
    const actionProfileStatCode = {
      name: `C407707 Update instance stat code action ${postfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    };
    const actionProfileAdminNote = {
      name: `C407707 Update Instance admin note action ${postfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    };
    const actionProfileStatusTerm = {
      name: `C407707 Update instance status term action ${postfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    };
    const matchProfile = {
      profileName: `C407707 001 to Instance HRID match ${postfix}`,
      incomingRecordFields: { field: '001', in1: '', in2: '', subfield: '' },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      existingMatchExpressionValue: 'instance.hrid',
    };
    const jobProfile = {
      profileName: `C407707 Update instance 3 times with 001 match ${postfix}`,
    };

    const testData = {};
    let user;

    before('Create test data, trigger import via API, login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C407707_');

      cy.then(() => {
        cy.getStatisticalCodes({ limit: 1 }).then((codes) => {
          testData.statisticalCode = codes[0];
          cy.getStatisticalCodeTypes({
            limit: 1,
            query: `id=="${testData.statisticalCode.statisticalCodeTypeId}"`,
          }).then((types) => {
            testData.statisticalCodeCombo = `${types[0].name}: ${testData.statisticalCode.code} - ${testData.statisticalCode.name}`;
          });
        });

        InventoryInstance.createInstanceViaApi({ instanceTitle }).then(({ instanceData }) => {
          testData.instanceId = instanceData.instanceId;
        });
      })
        .then(() => {
          // Steps 1-3: export the created Instance as MARC via the default instances export
          // job profile (same net result as exporting it via the UI)
          FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.instanceId);
          ExportFile.exportFileViaApi(
            csvFileName,
            'instance',
            'Default instances export job profile',
          ).then(() => {
            ExportFile.downloadExportedMarcFile(exportedMarcFileName);
          });
        })
        .then(() => {
          cy.readFile(`cypress/downloads/${exportedMarcFileName}`, 'binary').then((content) => {
            cy.writeFile(`cypress/fixtures/${exportedMarcFileName}`, content, 'binary');
          });
        })
        .then(() => {
          // Step 4: field mapping profile - add a statistical code to the Instance
          NewFieldMappingProfile.createInstanceStatisticalCodeMappingProfileViaApi({
            name: mappingProfileStatCode.name,
            statisticalCode: testData.statisticalCodeCombo,
          }).then((mappingProfileResponse) => {
            // Step 7: action profile linked to the stat code mapping profile
            NewActionProfile.createActionProfileViaApi(
              actionProfileStatCode,
              mappingProfileResponse.body.id,
            ).then((actionResponse) => {
              actionProfileStatCode.id = actionResponse.body.id;
            });
          });
        })
        .then(() => {
          // Step 5: field mapping profile - add an administrative note to the Instance
          NewFieldMappingProfile.createInstanceAdministrativeNoteMappingProfileViaApi({
            name: mappingProfileAdminNote.name,
            administrativeNote: administrativeNoteValue,
          }).then((mappingProfileResponse) => {
            // Step 8: action profile linked to the admin note mapping profile
            NewActionProfile.createActionProfileViaApi(
              actionProfileAdminNote,
              mappingProfileResponse.body.id,
            ).then((actionResponse) => {
              actionProfileAdminNote.id = actionResponse.body.id;
            });
          });
        })
        .then(() => {
          // Step 6: field mapping profile - set the Instance status term
          NewFieldMappingProfile.createInstanceStatusTermMappingProfileViaApi({
            name: mappingProfileStatusTerm.name,
            statusTerm: statusTermValue,
          }).then((mappingProfileResponse) => {
            // Step 9: action profile linked to the status term mapping profile
            NewActionProfile.createActionProfileViaApi(
              actionProfileStatusTerm,
              mappingProfileResponse.body.id,
            ).then((actionResponse) => {
              actionProfileStatusTerm.id = actionResponse.body.id;
            });
          });
        })
        .then(() => {
          // Step 10: match profile - incoming 001 exactly matches existing Instance HRID
          NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi(
            matchProfile,
          ).then(({ body }) => {
            matchProfile.id = body.id;
          });
        })
        .then(() => {
          // Step 11: job profile - match, followed by the 3 update actions in sequence
          NewJobProfile.createJobProfileWithLinkedMatchAndActionProfileAndNonMatchActionProfileViaApi(
            jobProfile.profileName,
            matchProfile.id,
            [actionProfileStatCode.id, actionProfileAdminNote.id, actionProfileStatusTerm.id],
            undefined,
          ).then((id) => {
            jobProfile.id = id;
          });
        })
        .then(() => {
          // Step 12: trigger the import of the exported file using the job profile created above
          DataImport.uploadFileViaApi(
            exportedMarcFileName,
            exportedMarcFileName,
            jobProfile.profileName,
          );
        })
        .then(() => {
          cy.createTempUser([
            Permissions.settingsDataImportEnabled.gui,
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
            Permissions.dataExportSettingsViewOnly.gui,
          ]).then((createdUser) => {
            user = createdUser;

            cy.login(user.username, user.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileStatCode.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileAdminNote.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileStatusTerm.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileStatCode.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileAdminNote.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
          mappingProfileStatusTerm.name,
        );
        FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${exportedMarcFileName}`);
        FileManager.deleteFile(`cypress/downloads/${exportedMarcFileName}`);
      });
    });

    it(
      'C407707 Verify that 3 successive update actions for Instance proceed without errors using data export (promin)',
      { tags: ['edgeCases', 'promin', 'C407707'] },
      () => {
        // Step 13: job completed with no errors, Instance has status "Updated"
        Logs.waitFileIsImported(exportedMarcFileName);
        Logs.checkJobStatus(exportedMarcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(exportedMarcFileName);
        FileDetails.checkStatusInColumn(
          FileDetails.status.updated,
          FileDetails.columnNameInResultList.instance,
        );

        // Step 14: click the "Updated" hotlink for the Instance column
        FileDetails.openInstanceInInventory(FileDetails.status.updated);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened(instanceTitle);

        // Step 15: Statistical code matches the value from the mapping profile
        InstanceRecordView.verifyStatisticalCode(testData.statisticalCode.name);

        // Step 16: Administrative notes matches the value from the mapping profile
        InstanceRecordView.verifyAdministrativeNote(administrativeNoteValue);

        // Step 17: Instance status term matches the value from the mapping profile
        InstanceRecordView.verifyInstanceStatusTerm(statusTermValue);
      },
    );
  });
});
