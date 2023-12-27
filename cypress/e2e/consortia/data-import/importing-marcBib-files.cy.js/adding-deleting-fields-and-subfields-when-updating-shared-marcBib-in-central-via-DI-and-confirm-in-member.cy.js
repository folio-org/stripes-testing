import Permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import Affiliations from '../../../../support/dictionary/affiliations';
import {
  LOCATION_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
} from '../../../../support/constants';
import FieldMappingProfiles from '../../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import MatchProfiles from '../../../../support/fragments/data_import/match_profiles/matchProfiles';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import FileManager from '../../../../support/utils/fileManager';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import NewFieldMappingProfile from '../../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMatchProfile from '../../../../support/fragments/data_import/match_profiles/newMatchProfile';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      sharedInstanceId: [],
      marcFile: {
        marc: 'marcBibFileForC405531.mrc',
        fileName: `C405531 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        exportedFileName: `C405531 exportedTestMarcFile${getRandomPostfix()}.mrc`,
        marcFileForModify: 'marcBibFileForC405531_1.mrc',
        modifiedMarcFile: `C405531 modifiedTestMarcFile${getRandomPostfix()}.mrc`,
      },
    };
    const mappingProfile = {
      name: `C405531 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: `C405531 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_BIBLIOGRAPHIC',
    };
    const matchProfile = {
      profileName: `C405531 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfileName = `C405531 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;

    before('Create test data', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApiMarc(
            actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
              matchProfile,
            ).then((matchProfileResponse) => {
              NewJobProfile.createJobProfileViaApi(
                jobProfileName,
                matchProfileResponse.body.id,
                actionProfileResponse.body.id,
              );
            });
          });
        },
      );
      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
      DataImport.verifyUploadState();
      DataImport.uploadFileAndRetry(testData.marcFile.marc, testData.marcFile.fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(testData.marcFile.jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(testData.marcFile.fileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(testData.marcFile.fileName);
      Logs.getCreatedItemsID().then((link) => {
        testData.sharedInstanceId.push(link.split('/')[5]);
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportEnableApp.gui,
      ])
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.dataExportEnableApp.gui,
          ]);

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.resetTenant();
        });
    });

    it(
      'C405531 Check adding/deleting fields and subfields when updating shared "MARC Bib" in Central tenant via Data import and confirm in member tenant (consortia) (folijet)',
      { tags: ['extended', 'folijet'] },
      () => {
        InventoryInstance.searchByTitle(testData.sharedInstanceId[0]);
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventorySearchAndFilter.verifySelectedRecords(1);
        InventorySearchAndFilter.exportInstanceAsMarc();

        // download exported marc file
        cy.visit(TopMenu.dataExportPath);
        cy.wait(1000);
        ExportFile.getExportedFileNameViaApi().then((name) => {
          testData.marcFile.exportedFileName = name;
          ExportFile.downloadExportedMarcFile(testData.marcFile.exportedFileName);
          // change exported file
          DataImport.replace999SubfieldsInPreupdatedFile(
            testData.marcFile.exportedFileName,
            testData.marcFile.marcFileForModify,
            testData.marcFile.modifiedMarcFile,
          );
        });

        // upload the exported marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(testData.marcFile.modifiedMarcFile);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.marcFile.modifiedMarcFile);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.marcFile.modifiedMarcFile);

        InventoryInstance.searchByTitle(testData.sharedInstanceId[0]);
        InventoryInstance.waitInstanceRecordViewOpened('C405531 Instance Shared Central');
      },
    );
  });
});
