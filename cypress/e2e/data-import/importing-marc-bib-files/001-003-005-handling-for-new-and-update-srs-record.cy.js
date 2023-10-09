import getRandomPostfix from '../../../support/utils/stringTools';
import {
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import { DevTeams, TestTypes, Parallelization } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import FileManager from '../../../support/utils/fileManager';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid = null;
    let instanceHridForReimport = null;
    let exportedFileName = null;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    // resource identifiers
    const resourceIdentifiers = [
      { type: 'OCLC', value: '(OCoLC)26493177' },
      { type: 'System control number', value: '(ICU)1299036' },
    ];
    const instanceStatusTerm = INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED;
    const catalogedDate = '###TODAY###';

    // unique file names
    const nameMarcFileForCreate = `C17039 autotestFile.${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C17039 fileWith999Field.${getRandomPostfix()}.mrc`;
    const fileNameAfterUpload = `C17039 uploadedFile.${getRandomPostfix()}.mrc`;

    const matchProfile = {
      profileName: `C17039 match profile ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 'i',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      existingRecordOption: NewMatchProfile.optionsList.instanceUuid,
    };

    const mappingProfile = {
      name: `C17039 mapping profile ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };

    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C17039 action profile ${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };

    const jobProfile = {
      profileName: `C17039 job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      cy.getAdminToken().then(() => {
        const fileName = `C17039autotestFile.${getRandomPostfix()}.mrc`;

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', fileName);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.openFileDetails(fileName);

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHridForReimport = initialInstanceHrId;
        });
      });
    });

    after('delete test data', () => {
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"hrid"=="${instanceHridForReimport}"`,
      }).then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    });

    it(
      'C17039 Test 001/003/035 handling for New and Updated SRS records (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.nonParallel] },
      () => {
        // upload a marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFilrForC17039.mrc', nameMarcFileForCreate);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameMarcFileForCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable('1');

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;
          // check fields are absent in the view source
          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InventoryInstance.verifyResourceIdentifier(
            resourceIdentifiers[0].type,
            resourceIdentifiers[0].value,
            0,
          );
          InventoryInstance.verifyResourceIdentifier(
            resourceIdentifiers[1].type,
            resourceIdentifiers[1].value,
            1,
          );
          // verify table data in marc bibliographic source
          InventoryInstance.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource('001\t', instanceHrid);
          InventoryViewSource.notContains('003\t');
          InventoryViewSource.verifyFieldInMARCBibSource('035\t', '(ICU)1299036');

          InventoryViewSource.extructDataFrom999Field().then((uuid) => {
            // change file using uuid for 999 field
            DataImport.editMarcFile(
              'marcFilrForC17039With999Field.mrc',
              editedMarcFileName,
              ['srsUuid', 'instanceUuid'],
              [uuid[0], uuid[1]],
            );
          });

          // create match profile
          cy.visit(SettingsMenu.matchProfilePath);
          MatchProfiles.createMatchProfileWithExistingPart(matchProfile);
          MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

          // create mapping profiles
          cy.visit(SettingsMenu.mappingProfilePath);
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
          NewFieldMappingProfile.fillInstanceStatusTerm(instanceStatusTerm);
          NewFieldMappingProfile.fillCatalogedDate(catalogedDate);
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(mappingProfile.name);
          FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

          // create action profile
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(actionProfile, mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(actionProfile.name);

          // create job profile for update
          cy.visit(SettingsMenu.jobProfilePath);
          JobProfiles.createJobProfileWithLinkingProfiles(
            jobProfile,
            actionProfile.name,
            matchProfile.profileName,
          );
          JobProfiles.checkJobProfilePresented(jobProfile.profileName);

          // upload a marc file for updating already created instance
          cy.visit(TopMenu.dataImportPath);
          // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          DataImport.verifyUploadState();
          DataImport.uploadFile(editedMarcFileName, fileNameAfterUpload);
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(fileNameAfterUpload);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(fileNameAfterUpload);
          FileDetails.checkStatusInColumn(
            FileDetails.status.updated,
            FileDetails.columnNameInResultList.srsMarc,
          );
          FileDetails.checkStatusInColumn(
            FileDetails.status.updated,
            FileDetails.columnNameInResultList.instance,
          );
          FileDetails.checkSrsRecordQuantityInSummaryTable('1', '1');
          FileDetails.checkInstanceQuantityInSummaryTable('1', '1');

          // check instance is updated
          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InventoryInstance.checkIsInstanceUpdated();
          // verify table data in marc bibliographic source
          InventoryInstance.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource('001\t', instanceHrid);
          InventoryViewSource.notContains('003\t');
          InventoryViewSource.verifyFieldInMARCBibSource('035\t', '(ICU)1299036');
        });

        // export instance
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHridForReimport);
        InstanceRecordView.verifyInstancePaneExists();
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventorySearchAndFilter.exportInstanceAsMarc();

        // download exported marc file
        cy.visit(TopMenu.dataExportPath);
        ExportFile.getExportedFileNameViaApi().then((name) => {
          exportedFileName = name;

          ExportFile.downloadExportedMarcFile(exportedFileName);
          // upload the exported marc file
          cy.visit(TopMenu.dataImportPath);
          // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          DataImport.verifyUploadState();
          DataImport.uploadExportedFile(exportedFileName);
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(exportedFileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(exportedFileName);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.instance,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
          });
          FileDetails.checkSrsRecordQuantityInSummaryTable('1', '1');
          FileDetails.checkInstanceQuantityInSummaryTable('1', '1');
        });

        // check instance is updated
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHridForReimport);
        InventoryInstance.checkIsInstanceUpdated();

        // verify table data in marc bibliographic source
        InventoryInstance.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource('001\t', instanceHridForReimport);
        InventoryViewSource.notContains(`\\$a${instanceHridForReimport}`);
      },
    );
  });
});
