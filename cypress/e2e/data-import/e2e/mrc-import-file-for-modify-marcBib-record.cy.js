import TestTypes from '../../../support/dictionary/testTypes';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import FileManager from '../../../support/utils/fileManager';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import DevTeams from '../../../support/dictionary/devTeams';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('ui-data-import', () => {
  let user = {};
  let instanceHRID;

  // unique name for profiles
  const mappingProfileName = `autoTestMappingProf.${getRandomPostfix()}`;
  const actionProfileName = `autoTestActionProf.${getRandomPostfix()}`;
  const matchProfileName = `autoTestMatchProf.${getRandomPostfix()}`;
  const jobProfileName = `autoTestJobProf.${getRandomPostfix()}`;

  // file name
  const nameMarcFileForCreate = `C345423autotestFile.${getRandomPostfix()}.mrc`;
  const nameForCSVFile = `C345423autotestFile${getRandomPostfix()}.csv`;
  const nameMarcFileForUpload = `C345423autotestFile.${getRandomPostfix()}.mrc`;

  const mappingProfileFieldsForModify = { name: mappingProfileName,
    typeValue: NewFieldMappingProfile.folioRecordTypeValue.marcBib };

  const actionProfile = {
    name: actionProfileName,
    action: 'Modify (MARC Bibliographic record type only)',
    typeValue: 'MARC Bibliographic',
  };

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

  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before(() => {
    cy.createTempUser([
      permissions.dataImportUploadAll.gui,
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiInventoryViewInstances.gui,
      permissions.dataExportEnableModule.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading
        });
      });
  });

  after(() => {
    // delete profiles
    JobProfiles.deleteJobProfile(jobProfileName);
    MatchProfiles.deleteMatchProfile(matchProfileName);
    ActionProfiles.deleteActionProfile(actionProfileName);
    FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
    // delete downloads folder and created files in fixtures
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    FileManager.deleteFile(`cypress/fixtures/${nameMarcFileForUpload}`);
    FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
    Users.deleteViaApi(user.userId);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C345423 Verify the possibility to modify MARC Bibliographic record (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
    cy.reload();
    // upload a marc file for creating of the new instance, holding and item
    DataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForCreate);
    JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(nameMarcFileForCreate);
    Logs.openFileDetails(nameMarcFileForCreate);
    [FileDetails.columnName.srsMarc,
      FileDetails.columnName.instance,
    ].forEach(columnName => {
      FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
    });

    // get Instance HRID through API
    InventorySearchAndFilter.getInstanceHRID()
      .then(hrId => {
        instanceHRID = hrId[0];

        // download .csv file
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(hrId[0]);
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      });
    // download exported marc file
    cy.visit(TopMenu.dataExportPath);
    ExportFile.uploadFile(nameForCSVFile);
    ExportFile.exportWithDefaultJobProfile(nameForCSVFile);
    ExportFile.downloadExportedMarcFile(nameMarcFileForUpload);
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));

    // create Field mapping profile
    cy.visit(SettingsMenu.mappingProfilePath);
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfileFieldsForModify);
    NewFieldMappingProfile.addFieldMappingsForMarc();
    NewFieldMappingProfile.fillModificationSectionWithAdd('Add', '947', 'a', 'Add subfield', 'Test', 'b', 'Addition');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfileFieldsForModify.name);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

    // create Action profile and link it to Field mapping profile
    cy.visit(SettingsMenu.actionProfilePath);
    ActionProfiles.create(actionProfile, mappingProfileName);
    ActionProfiles.checkActionProfilePresented(actionProfileName);

    // create Match profile
    cy.visit(SettingsMenu.matchProfilePath);
    MatchProfiles.createMatchProfile(matchProfile);

    // create Job profile
    cy.visit(SettingsMenu.jobProfilePath);
    JobProfiles.createJobProfileWithLinkingProfiles(jobProfile, actionProfileName, matchProfileName);
    JobProfiles.checkJobProfilePresented(jobProfile.profileName);

    // upload a marc file for creating of the new instance, holding and item
    cy.visit(TopMenu.dataImportPath);
    // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
    cy.reload();
    DataImport.uploadFile(nameMarcFileForUpload);
    JobProfiles.searchJobProfileForImport(jobProfile.profileName);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(nameMarcFileForUpload);
    Logs.checkStatusOfJobProfile();
    Logs.checkImportFile(jobProfile.profileName);
    Logs.openFileDetails(nameMarcFileForUpload);
    [FileDetails.columnName.srsMarc,
      FileDetails.columnName.instance
    ].forEach(columnName => {
      FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
    });
  });
});
