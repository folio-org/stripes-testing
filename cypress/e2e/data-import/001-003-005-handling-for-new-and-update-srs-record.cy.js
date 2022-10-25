import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import NewMatchProfile from '../../support/fragments/data_import/match_profiles/newMatchProfile';
import Helper from '../../support/fragments/finance/financeHelper';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../support/fragments/settingsMenu';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import ExportMarcFile from '../../support/fragments/data-export/export-marc-file';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import FileManager from '../../support/utils/fileManager';
import ExportFile from '../../support/fragments/data-export/exportFile';

describe('ui-data-import: Test 001/003/035 handling for New and Updated SRS records', () => {
  let instanceHrid = null;
  let instanceHridForReimport = null;
  // resource identifiers
  const resourceIdentifiers = [
    { type: 'OCLC', value: '(OCoLC)26493177' },
    { type: 'System control number', value: '(ICU)1299036' }
  ];
  const instanceStatusTerm = '"Batch Loaded"';
  const catalogedDate = '###TODAY###';

  // unique file names
  const nameMarcFileForCreate = `C17039 autotestFile.${getRandomPostfix()}.mrc`;
  const editedMarcFileName = `C17039 fileWith999Field.${getRandomPostfix()}.mrc`;
  const nameFileNameAfterUpload = `C17039 uploadedFile.${getRandomPostfix()}.mrc`;
  const nameForCSVFile = `C17039 csvAutotestFile${getRandomPostfix()}.csv`;
  const nameExportedMarcFile = `C17039 exportedAutotestFile${getRandomPostfix()}.mrc`;

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

  before(() => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    cy.getAdminToken()
      .then(() => {
        const fileName = `C358136autotestFile.${getRandomPostfix()}.mrc`;

        cy.visit(TopMenu.dataImportPath);
        DataImport.uploadFile('oneMarcBib.mrc', fileName);
        JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
        JobProfiles.runImportFile(fileName);
        Logs.openFileDetails(fileName);

        // get Instance HRID through API
        InventorySearch.getInstanceHRID()
          .then(hrId => {
            instanceHridForReimport = hrId[0];
          });
      });
  });

  after(() => {
    JobProfiles.deleteJobProfile(jobProfileName);
    MatchProfiles.deleteMatchProfile(matchProfileName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHridForReimport}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    // delete downloads folder and created files in fixtures
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    FileManager.deleteFile(`cypress/fixtures/${nameExportedMarcFile}`);
    FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
    FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);0
  });

  it('C17039 Test 001/003/035 handling for New and Updated SRS records (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    // upload a marc file
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('marcFilrForC17039.mrc', nameMarcFileForCreate);
    JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
    JobProfiles.runImportFile(nameMarcFileForCreate);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(nameMarcFileForCreate);
    [FileDetails.columnName.srsMarc,
      FileDetails.columnName.instance].forEach(columnName => {
      FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
    });
    FileDetails.checkSrsRecordQuantityInSummaryTable('1');
    FileDetails.checkInstanceQuantityInSummaryTable('1');

    // get Instance HRID through API
    InventorySearch.getInstanceHRID()
      .then(hrId => {
        instanceHrid = hrId[0];
        // check fields are absent in the view source
        cy.visit(TopMenu.inventoryPath);
        InventorySearch.searchInstanceByHRID(instanceHrid);
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
        MatchProfiles.createMatchProfileWithMatchingBy999Field(matchProfile);
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
        ActionProfiles.createActionProfile(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile for update
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfileName, matchProfileName);
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for updating already created instance
        cy.visit(TopMenu.dataImportPath);
        DataImport.uploadFile(editedMarcFileName, nameFileNameAfterUpload);
        JobProfiles.searchJobProfileForImport(jobProfile.profileName);
        JobProfiles.runImportFile(nameFileNameAfterUpload);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(nameFileNameAfterUpload);
        FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.srsMarc);
        FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.instance);
        FileDetails.checkSrsRecordQuantityInSummaryTable('1', '1');
        FileDetails.checkInstanceQuantityInSummaryTable('1', '1');

        // check instance is updated
        cy.visit(TopMenu.inventoryPath);
        InventorySearch.searchInstanceByHRID(instanceHrid);
        InventoryInstance.checkIsInstanceUpdated();
        // verify table data in marc bibliographic source
        InventoryInstance.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource('001\t', instanceHrid);
        InventoryViewSource.notContains('003\t');
        InventoryViewSource.verifyFieldInMARCBibSource('035\t', '(ICU)1299036');
      });

    // ensure that extra 035s are not being created
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchInstanceByHRID(instanceHridForReimport);
    InventorySearch.saveUUIDs();
    ExportMarcFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));

    // download exported marc file
    cy.visit(TopMenu.dataExportPath);
    ExportFile.uploadFile(nameForCSVFile);
    // TODO export with Export instances (MARC)
    ExportFile.exportWithDefaultInstancesJobProfile(nameForCSVFile);
    ExportMarcFile.downloadExportedMarcFile(nameExportedMarcFile);

    // upload the exported marc file
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadExportedFile(nameExportedMarcFile);
    JobProfiles.searchJobProfileForImport(jobProfile.profileName);
    JobProfiles.runImportFile(nameExportedMarcFile);
    Logs.openFileDetails(nameExportedMarcFile);

    // check instance is updated
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchInstanceByHRID(instanceHridForReimport);
    InventoryInstance.checkIsInstanceUpdated();

    // verify table data in marc bibliographic source
    InventoryInstance.viewSource();
    InventoryViewSource.verifyFieldInMARCBibSource('001\t', instanceHridForReimport);
    InventoryViewSource.notContains(`\\$a${instanceHridForReimport}`);
  });
});
