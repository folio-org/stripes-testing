import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import SettingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import MatchProfiles from '../../support/fragments/data_import/match_profiles/match-profiles';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import dataImport from '../../support/fragments/data_import/dataImport';
import logs from '../../support/fragments/data_import/logs';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import { testType } from '../../support/utils/tagTools';

describe('ui-data-import: MARC file import with matching for 999 ff field', () => {
  // unique file name to upload
  const fileName = `autotestFile.${getRandomPostfix()}.mrc`;
  const mappingProfileName = `autotestMappingProf.${getRandomPostfix()}`;
  const matchProfileName = `autotestMatchProf.${getRandomPostfix()}`;
  const actionProfileName = `autotestActionProf.${getRandomPostfix()}`;
  const jobProfileName = `autotestJobProf.${getRandomPostfix()}`;

  before(() => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.getToken(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
  });

  it('C343343 MARC file import with matching for 999 ff field', { tags: testType.smoke }, () => {
    // create Match profile
    const matchProfile = {
      profileName: matchProfileName,
      incomingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's'
      },
      existingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's'
      },
      matchCriterion: 'Exactly matches',
    };
    SettingsDataImport.goToMatchProfile();
    MatchProfiles.createMatchProfile(matchProfile);

    // create Field mapping profile
    const mappingProfile = {
      name: mappingProfileName,
      typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance,
    };
    SettingsDataImport.goToMappingProfile();
    FieldMappingProfiles.createMappingProfile(mappingProfile);
    FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

    // create Action profile and link it to Field mapping profile
    const actionProfile = {
      typeValue : NewActionProfile.folioRecordTypeValue.instance,
      name: actionProfileName
    };
    SettingsDataImport.goToActionProfile();
    ActionProfiles.createActionProfile(actionProfile, mappingProfile);
    ActionProfiles.checkActionProfilePresented(actionProfileName);

    // create Job profile
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

    // upload a marc file with 999.f.f.s fields
    dataImport.goToDataImport();
    dataImport.uploadFile(fileName);
    jobProfiles.searchJobProfileForImport(jobProfileName);
    jobProfiles.runImportFile(fileName);
    logs.checkImportFile(jobProfileName);

    // get Instance HRID through API
    SearchInventory
      .getInstanceHRID()
      .then(id => {
        SearchInventory.gotoInventory();
        SearchInventory.searchInstanceByHRID(id);
        // ensure the fields created in Field mapping profile exists in inventory
        SearchInventory.checkInstanceDetails();

        // clean up generated profiles
        jobProfiles.deleteJobProfile(jobProfileName);
        MatchProfiles.deleteMatchProfile(matchProfileName);
        ActionProfiles.deleteActionProfile(actionProfileName);
        FieldMappingProfiles.deleteFieldMappingProfile(mappingProfileName);
      });
  });
});
