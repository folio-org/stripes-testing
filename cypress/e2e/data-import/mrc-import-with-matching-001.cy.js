import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../support/fragments/topMenu';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/matchProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix from '../../support/utils/stringTools';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import ExportFile from '../../support/fragments/data-export/exportFile';
import ExportMarcFile from '../../support/fragments/data-export/export-marc-file';
import FileManager from '../../support/utils/fileManager';
import TestTypes from '../../support/dictionary/testTypes';
import SettingsMenu from '../../support/fragments/settingsMenu';
import FileDetails from '../../support/fragments/data_import/logs/fileDetails';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-data-import: MARC-MARC matching for 001 field', () => {
  let user = {};

  before(() => {
    cy.createTempUser([
      permissions.dataImportUploadAll.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.inventoryAll.gui,
      permissions.dataExportEnableModule.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      });
    DataImport.checkUploadState();
  });


  after(() => {
    DataImport.checkUploadState();
    Users.deleteViaApi(user.userId);
  });

  it('C17044: MARC-MARC matching for 001 field (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // unique file name to upload
    const nameForMarcFile = `C17044autoTestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `C17044autoTestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C17044autoTestFile${getRandomPostfix()}.csv`;

    // unique name for profiles
    const matchProfileName = `autoTestMatchProf.${getRandomPostfix()}`;
    const mappingProfileName = `autoTestMappingProf.${getRandomPostfix()}`;
    const actionProfileName = `autoTestActionProf.${getRandomPostfix()}`;
    const jobProfileName = `autoTestJobProf.${getRandomPostfix()}`;

    // upload a marc file for export
    DataImport.uploadFile('oneMarcBib.mrc', nameForMarcFile);
    JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
    JobProfiles.runImportFile(nameForMarcFile);
    Logs.openFileDetails(nameForMarcFile);
    FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnName.instance);

    // get Instance HRID through API
    InventorySearchAndFilter.getInstanceHRID()
      .then(hrId => {
        // download .csv file
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(hrId[0]);
        InventorySearchAndFilter.saveUUIDs();
        ExportMarcFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        cy.visit(TopMenu.dataExportPath);

        // download exported marc file
        ExportFile.uploadFile(nameForCSVFile);
        ExportFile.exportWithDefaultInstancesJobProfile(nameForCSVFile);
        ExportMarcFile.downloadExportedMarcFile(nameForExportedMarcFile);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));

        // create Match profile
        const matchProfile = {
          profileName: matchProfileName,
          incomingRecordFields: {
            field: '001',
          },
          existingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: 'MARC_BIBLIOGRAPHIC'
        };

        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);

        // create Field mapping profile
        const mappingProfile = {
          name: mappingProfileName,
          typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance,
          update: true,
          permanentLocation: '"Annex (KU/CC/DI/A)"',
        };

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.createMappingProfile(mappingProfile);

        // create Action profile and link it to Field mapping profile
        const actionProfile = {
          typeValue : NewActionProfile.folioRecordTypeValue.instance,
          name: actionProfileName,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        };
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfileName);

        // create Job profile
        const jobProfile = {
          ...NewJobProfile.defaultJobProfile,
          profileName: jobProfileName,
          acceptedType: NewJobProfile.acceptedDataType.marc
        };
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfileName, matchProfileName);
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload the exported marc file with 001 field
        cy.visit(TopMenu.dataImportPath);
        DataImport.uploadExportedFile(nameForExportedMarcFile);
        JobProfiles.searchJobProfileForImport(jobProfileName);
        JobProfiles.runImportFile(nameForExportedMarcFile);
        Logs.openFileDetails(nameForExportedMarcFile);
        FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnName.instance);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(hrId[0]);

        // ensure the fields created in Field mapping profile exists in inventory
        InventorySearchAndFilter.checkInstanceDetails();

        // clean up generated profiles
        JobProfiles.deleteJobProfile(jobProfileName);
        MatchProfiles.deleteMatchProfile(matchProfileName);
        ActionProfiles.deleteActionProfile(actionProfileName);
        FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);

        // delete created files in fixtures
        FileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcFile}`);
        FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      });
  });
});
