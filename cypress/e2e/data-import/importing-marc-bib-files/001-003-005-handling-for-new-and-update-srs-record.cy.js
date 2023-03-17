import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import Helper from '../../../support/fragments/finance/financeHelper';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import FileManager from '../../../support/utils/fileManager';

describe('ui-data-import', () => {
  let instanceHrid = null;
  let instanceHridForReimport = null;
  let exportedFileName = null;
  // resource identifiers
  const resourceIdentifiers = [
    { type: 'OCLC', value: '(OCoLC)26493177' },
    { type: 'System control number', value: '(ICU)1299036' }
  ];
  const instanceStatusTerm = 'Batch Loaded';
  const catalogedDate = '###TODAY###';

  // unique file names
  const nameMarcFileForCreate = `C17039 autotestFile.${getRandomPostfix()}.mrc`;
  const editedMarcFileName = `C17039 fileWith999Field.${getRandomPostfix()}.mrc`;
  const fileNameAfterUpload = `C17039 uploadedFile.${getRandomPostfix()}.mrc`;

  // unique profile names
  const matchProfileName = `C17039 match profile ${Helper.getRandomBarcode()}`;
  const mappingProfileName = `C17039 mapping profile ${Helper.getRandomBarcode()}`;
  const actionProfileName = `C17039 action profile ${Helper.getRandomBarcode()}`;
  const jobProfileName = `C17039 job profile ${Helper.getRandomBarcode()}`;

  const matchProfile = {
    profileName: matchProfileName,
    incomingRecordFields: {
      field: '999',
      in1: 'f',
      in2: 'f',
      subfield: 'i'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
    instanceOption: NewMatchProfile.optionsList.instanceUuid
  };

  const mappingProfile = {
    name: mappingProfileName,
    typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance
  };

  const actionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.instance,
    name: actionProfileName,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };

  const jobProfile = {
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before('create test data', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    cy.getAdminToken()
      .then(() => {
        const fileName = `C17039autotestFile.${getRandomPostfix()}.mrc`;

        cy.visit(TopMenu.dataImportPath);
        // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
        cy.reload();
        DataImport.uploadFile('oneMarcBib.mrc', fileName);
        JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.openFileDetails(fileName);

        // get Instance HRID through API
        InventorySearchAndFilter.getInstanceHRID()
          .then(hrId => {
            instanceHridForReimport = hrId[0];
          });
      });
  });

  after('delete test data', () => {
    JobProfiles.deleteJobProfile(jobProfileName);
    MatchProfiles.deleteMatchProfile(matchProfileName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
    // delete downloads folder and created files in fixtures
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHridForReimport}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C17039 Test 001/003/035 handling for New and Updated SRS records (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // upload a marc file
    cy.visit(TopMenu.dataImportPath);
    // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
    cy.reload();
    DataImport.uploadFile('marcFilrForC17039.mrc', nameMarcFileForCreate);
    JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(nameMarcFileForCreate);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(nameMarcFileForCreate);
    [FileDetails.columnName.srsMarc,
      FileDetails.columnName.instance].forEach(columnName => {
      FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
    });
    FileDetails.checkSrsRecordQuantityInSummaryTable('1');
    FileDetails.checkInstanceQuantityInSummaryTable('1');

    // get Instance HRID through API
    InventorySearchAndFilter.getInstanceHRID()
      .then(hrId => {
        instanceHrid = hrId[0];
        // check fields are absent in the view source
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InventoryInstance.verifyResourceIdentifier(resourceIdentifiers[0].type, resourceIdentifiers[0].value, 0);
        InventoryInstance.verifyResourceIdentifier(resourceIdentifiers[1].type, resourceIdentifiers[1].value, 1);
        // verify table data in marc bibliographic source
        InventoryInstance.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource('001\t', instanceHrid);
        InventoryViewSource.notContains('003\t');
        InventoryViewSource.verifyFieldInMARCBibSource('035\t', '(ICU)1299036');

        InventoryViewSource.extructDataFrom999Field()
          .then(uuid => {
            // change file using uuid for 999 field
            DataImport.editMarcFile(
              'marcFilrForC17039With999Field.mrc',
              editedMarcFileName,
              ['srsUuid', 'instanceUuid'],
              [uuid[0], uuid[1]]
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
        FieldMappingProfiles.saveProfile();
        FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile for update
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfileName, matchProfileName);
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for updating already created instance
        cy.visit(TopMenu.dataImportPath);
        // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
        cy.reload();
        DataImport.uploadFile(editedMarcFileName, fileNameAfterUpload);
        JobProfiles.searchJobProfileForImport(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileNameAfterUpload);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(fileNameAfterUpload);
        FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.srsMarc);
        FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.instance);
        FileDetails.checkSrsRecordQuantityInSummaryTable('1', '1');
        FileDetails.checkInstanceQuantityInSummaryTable('1', '1');

        // check instance is updated
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
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
    InventorySearchAndFilter.closeInstanceDetailPane();
    InventorySearchAndFilter.selectResultCheckboxes(1);
    InventorySearchAndFilter.exportInstanceAsMarc();

    // download exported marc file
    cy.visit(TopMenu.dataExportPath);
    ExportFile.getExportedFileNameViaApi()
      .then(name => {
        exportedFileName = name;

        ExportFile.downloadExportedMarcFile(exportedFileName);
        // upload the exported marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete code after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.clickDataImportNavButton();
        DataImport.uploadExportedFile(exportedFileName);
        JobProfiles.searchJobProfileForImport(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(exportedFileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(exportedFileName);
        [FileDetails.columnName.srsMarc,
          FileDetails.columnName.instance].forEach(columnName => {
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
  });
});
