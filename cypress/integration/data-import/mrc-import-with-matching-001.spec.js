import SettingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import dataImport from '../../support/fragments/data_import/dataImport';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../support/fragments/topMenu';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/match-profiles';
import logs from '../../support/fragments/data_import/logs';
import inventorySearch from '../../support/fragments/inventory/inventorySearch';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import getRandomPostfix from '../../support/utils/stringTools';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import exportFile from '../../support/fragments/data-export/exportFile';
import ExportMarcFile from '../../support/fragments/data-export/export-marc-file';

describe('ui-data-import: Test MARC-MARC matching for 001 field', () => {
  before(() => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.getToken(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );

    cy.visit(TopMenu.dataImportPath);
  });

  it('C17044: MARC-MARC matching for 001 field', () => {
    const nameForMarcFile = `autotestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `autotestFile${getRandomPostfix()}.csv`;

    const matchProfileName = `autotestMatchProf.${getRandomPostfix()}`;
    const mappingProfileName = `autotestMappingProf.${getRandomPostfix()}`;
    const actionProfileName = `autotestActionProf.${getRandomPostfix()}`;
    const jobProfileName = `autotestJobProf.${getRandomPostfix()}`;

    dataImport.uploadFile(nameForMarcFile);
    jobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
    jobProfiles.runImportFile(nameForMarcFile);
    logs.openJobProfile(nameForMarcFile);
    logs.checkIsInstanceCreated();

    SearchInventory
      .getInstanceHRID()
      .then(id => {
        // download .csv file
        SearchInventory.gotoInventory();
        SearchInventory.searchInstanceByHRID(id);
        inventorySearch.saveUUIDs();
        ExportMarcFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        cy.visit(TopMenu.dataExport);

        // download exported marc file
        exportFile.uploadFile(nameForCSVFile);
        exportFile.exportWithDefaultInstancesJobProfile(nameForCSVFile);
        ExportMarcFile.downloadExportedMarcFile(nameForExportedMarcFile);

        cy.log('#####End Of Export#####');

        const matchProfile = {
          profileName: matchProfileName,
          incomingRecordFields: {
            field: '001',
          },
          existingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
        };

        SettingsDataImport.goToMatchProfile();

        MatchProfiles.createMatchProfile(matchProfile);
    
        const mappingProfile = {
          name: mappingProfileName,
          typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance,
          update: true
        };
    
        SettingsDataImport.goToMappingProfile();
        FieldMappingProfiles.createMappingProfile(mappingProfile);
    
        const actionProfile = {
          typeValue : NewActionProfile.folioRecordTypeValue.instance,
          name: actionProfileName,
          action: 'Update (all record types except Orders)',
        };
        SettingsDataImport.goToActionProfile();
        ActionProfiles.createActionProfile(actionProfile, mappingProfile);
        ActionProfiles.checkActionProfilePresented(actionProfileName);
    
        const jobProfile = {
          ...NewJobProfile.defaultJobProfile,
          profileName: jobProfileName
        };
        SettingsDataImport.goToJobProfile();
        jobProfiles.openNewJobProfileForm();
        NewJobProfile.fillJobProfile(jobProfile);
        NewJobProfile.linkMatchAndActionProfiles(matchProfileName, actionProfileName);
        NewJobProfile.clickSaveAndCloseButton();
        jobProfiles.waitLoadingList();
        jobProfiles.checkJobProfilePresented(jobProfile.profileName);

        dataImport.goToDataImport();
        dataImport.uploadFile(nameForExportedMarcFile);
        jobProfiles.searchJobProfileForImport(jobProfileName);
        jobProfiles.runImportFile(nameForExportedMarcFile);

        SearchInventory
          .getInstanceHRID()
          .then(hrId => {
            SearchInventory.gotoInventory();
            SearchInventory.searchInstanceByHRID(hrId);

            // ensure the fields created in Field mapping profile exists in inventory
            SearchInventory.checkInstanceDetails();
          });
      });
  });
});
