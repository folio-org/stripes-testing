import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import { FOLIO_RECORD_TYPE, LOCALION_NAMES } from '../../../support/constants';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix from '../../../support/utils/stringTools';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';
import TestTypes from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import DevTeams from '../../../support/dictionary/devTeams';

describe('ui-data-import', () => {
  let user = {};
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  // unique file name to upload
  const nameForMarcFile = `C17044autoTestFile${getRandomPostfix()}.mrc`;
  const nameForExportedMarcFile = `C17044autoTestFile${getRandomPostfix()}.mrc`;
  const nameForCSVFile = `C17044autoTestFile${getRandomPostfix()}.csv`;
  const matchProfile = {
    profileName: `autoTestMatchProf.${getRandomPostfix()}`,
    incomingRecordFields: {
      field: '001',
    },
    existingRecordFields: {
      field: '001',
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'MARC_BIBLIOGRAPHIC'
  };
  const mappingProfile = {
    name: `autoTestMappingProf.${getRandomPostfix()}`,
    typeValue : FOLIO_RECORD_TYPE.INSTANCE,
    update: true,
    permanentLocation: `"${LOCALION_NAMES.ANNEX}"`,
  };
  const actionProfile = {
    typeValue : FOLIO_RECORD_TYPE.INSTANCE,
    name: `autoTestActionProf.${getRandomPostfix()}`,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
  };
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `autoTestJobProf.${getRandomPostfix()}`,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before('login', () => {
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
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    // clean up generated profiles
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    MatchProfiles.deleteMatchProfile(matchProfile.profileName);
    ActionProfiles.deleteActionProfile(actionProfile.name);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfile.name);
    // delete created files in fixtures
    FileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcFile}`);
    FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
  });

  it('C17044: MARC-MARC matching for 001 field (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
    DataImport.verifyUploadState();
    // upload a marc file for export
    DataImport.uploadFile('oneMarcBib.mrc', nameForMarcFile);
    JobProfiles.searchJobProfileForImport(jobProfileToRun);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(nameForMarcFile);
    Logs.openFileDetails(nameForMarcFile);
    FileDetails.checkStatusInColumn(FileDetails.status.created, FileDetails.columnNameInResultList.instance);

    // get Instance HRID through API
    InventorySearchAndFilter.getInstanceHRID()
      .then(hrId => {
        // download .csv file
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(hrId[0]);
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        cy.visit(TopMenu.dataExportPath);

        // download exported marc file
        ExportFile.uploadFile(nameForCSVFile);
        ExportFile.exportWithDefaultJobProfile(nameForCSVFile);
        ExportFile.downloadExportedMarcFile(nameForExportedMarcFile);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));

        // create Match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);

        // create Field mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.createMappingProfile(mappingProfile);

        // create Action profile and link it to Field mapping profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create Job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfile.name, matchProfile.profileName);
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload the exported marc file with 001 field
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(nameForExportedMarcFile);
        JobProfiles.searchJobProfileForImport(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameForExportedMarcFile);
        Logs.openFileDetails(nameForExportedMarcFile);
        FileDetails.checkStatusInColumn(FileDetails.status.updated, FileDetails.columnNameInResultList.instance);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(hrId[0]);

        // ensure the fields created in Field mapping profile exists in inventory
        InventorySearchAndFilter.checkInstanceDetails();
      });
  });
});
