import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {};
    const fileName = `AT_C368010_MarcBib_${randomPostfix}.mrc`;
    const csvFileName = `AT_C368010_instances_${randomPostfix}.csv`;
    const exportedFileName = `AT_C368010_Exported_${randomPostfix}.mrc`;
    const fileNameForImport = `AT_C368010_ImportFile_${randomPostfix}.mrc`;
    const exportMappingProfileName = `AT_C368010_ExportMappingProfile_${randomPostfix}`;
    const exportJobProfileBaseName = `AT_C368010_ExportJobProfile_${randomPostfix}`;
    const exportJobProfileName = `${exportJobProfileBaseName} export job profile`;
    const itemMappingProfileName = `AT_C368010_ItemMappingProfile_${randomPostfix}`;
    const itemActionProfileName = `AT_C368010_ItemActionProfile_${randomPostfix}`;
    const matchProfileName = `AT_C368010_MatchProfile_${randomPostfix}`;
    const jobProfileName = `AT_C368010_ImportJobProfile_${randomPostfix}`;

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.getLocations({ limit: 1 })
        .then((loc) => {
          testData.locationId = loc.id;
        })
        .then(() => InventoryHoldings.getHoldingsFolioSource())
        .then((folioSource) => {
          testData.sourceId = folioSource.id;
        })
        .then(() => DataImport.uploadFileViaApi(
          'oneMarcBib.mrc',
          fileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ))
        .then((response) => {
          testData.instanceId = response[0].instance.id;
          testData.instanceHrid = response[0].instance.hrid;
          FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.instanceId);
        })
        // precondition: the instance has exactly 1 Holdings record, but no Items
        .then(() => InventoryHoldings.createHoldingRecordViaApi({
          instanceId: testData.instanceId,
          sourceId: testData.sourceId,
          permanentLocationId: testData.locationId,
        }))
        // custom export mapping profile: embeds Holdings HRID (901$a) and Holdings ID (902$a)
        // into the exported MARC bib, so the re-imported file can be matched on Holdings HRID
        .then(() => cy.createDataExportCustomMappingProfile({
          default: false,
          recordTypes: ['SRS', 'HOLDINGS'],
          outputFormat: 'MARC',
          name: exportMappingProfileName,
          fieldsSuppression: '',
          suppress999ff: false,
          transformations: [
            {
              fieldId: 'holdings.hrid',
              path: '$.holdings[*].hrid',
              recordType: 'HOLDINGS',
              transformation: '901  $a',
              enabled: true,
            },
            {
              fieldId: 'holdings.id',
              path: '$.holdings[*].id',
              recordType: 'HOLDINGS',
              transformation: '902  $a',
              enabled: true,
            },
          ],
        }))
        .then((mappingProfileResponse) => {
          testData.exportMappingProfileId = mappingProfileResponse.id;
          return ExportNewJobProfile.createNewJobProfileViaApi(
            exportJobProfileName,
            testData.exportMappingProfileId,
          );
        })
        .then((jobProfileResponse) => {
          testData.exportJobProfileId = jobProfileResponse.body.id;
          return NewFieldMappingProfile.createItemMappingProfileViaApi({
            name: itemMappingProfileName,
            materialType: MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE,
            permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
            status: ITEM_STATUS_NAMES.AVAILABLE,
          });
        })
        .then((mappingProfileResponse) => {
          testData.itemMappingProfileId = mappingProfileResponse.body.id;
          return NewActionProfile.createActionProfileViaApi(
            {
              name: itemActionProfileName,
              action: 'CREATE',
              folioRecordType: EXISTING_RECORD_NAMES.ITEM,
            },
            testData.itemMappingProfileId,
          );
        })
        .then((actionProfileResponse) => {
          testData.itemActionProfileId = actionProfileResponse.body.id;
          // matches incoming 901$a (Holdings HRID embedded on export) to the existing Holdings
          // record, so the job profile (lacking a "create instance" action) creates only the Item
          return NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi({
            profileName: matchProfileName,
            incomingRecordFields: { field: '901', in1: '*', in2: '*', subfield: 'a' },
            recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
            existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
            existingMatchExpressionValue: 'holdings.hrid',
          });
        })
        .then((matchProfileResponse) => {
          testData.matchProfileId = matchProfileResponse.body.id;
          return NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
            jobProfileName,
            testData.matchProfileId,
            testData.itemActionProfileId,
          );
        })
        .then((importJobProfileId) => {
          testData.importJobProfileId = importJobProfileId;
          return cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ]);
        })
        .then((userProperties) => {
          testData.user = userProperties;
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.dataExportPath,
            waiter: DataExportLogs.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
      FileManager.deleteFile(`cypress/downloads/${exportedFileName}`);
      cy.getAdminToken(false);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"hrid"=="${testData.instanceHrid}"`,
      }).then((instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
      SettingsJobProfiles.deleteJobProfileViaApi(testData.importJobProfileId);
      SettingsMatchProfiles.deleteMatchProfileViaApi(testData.matchProfileId);
      SettingsActionProfiles.deleteActionProfileViaApi(testData.itemActionProfileId);
      SettingsFieldMappingProfiles.deleteMappingProfileViaApi(testData.itemMappingProfileId);
      ExportJobProfiles.deleteJobProfileViaApi(testData.exportJobProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(testData.exportMappingProfileId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      "C368010 Verify that no created SRS is present when job profile doesn't have create instance action: Case 1: Create item (promin)",
      { tags: ['edgeCases', 'promin', 'C368010'] },
      () => {
        // Steps 9-15: export the precondition instance via the custom export job profile
        ExportFile.uploadFile(csvFileName);
        ExportFile.exportWithDefaultJobProfile(csvFileName, exportJobProfileBaseName);
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === testData.user.userId);

          ExportFile.downloadExportedMarcFileWithRecordHrid(jobData.hrId, exportedFileName);
        });

        // Steps 16-18: re-import the exported file using the job profile created above
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(exportedFileName, fileNameForImport);
        JobProfiles.search(jobProfileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForImport);
        Logs.checkJobStatus(fileNameForImport, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForImport);

        // Step 19: no SRS record created, Item created
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.DASH,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.item,
        );
        FileDetails.checkSrsRecordQuantityInSummaryTable(RECORD_STATUSES.DASH);
        FileDetails.checkItemQuantityInSummaryTable('1', 0);

        FileDetails.openItemInInventory(RECORD_STATUSES.CREATED);
        ItemRecordView.verifyMaterialType(MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE);
        ItemRecordView.verifyPermanentLoanType(LOAN_TYPE_NAMES.CAN_CIRCULATE);
        ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.AVAILABLE);
      },
    );
  });
});
