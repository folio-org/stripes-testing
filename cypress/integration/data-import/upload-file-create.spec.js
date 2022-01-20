/// <reference types="cypress" />

import fieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import newActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import newMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import actionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import settingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import newJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import getRandomPostfix from '../../support/utils/stringTools';
import dataImport from '../../support/fragments/data_import/dataImport';
import dataImportLogs from '../../support/fragments/data_import/dataImportLogs';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import testTypes from '../../support/dictionary/testTypes';
import createdRecord from '../../support/fragments/data_import/createdRecord';

describe('ui-data-import: MARC file import with creating of the new instance, holding and item', () => {
  const fileName = `autotestFile.${getRandomPostfix()}.mrc`;

  before('navigates to Settings', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });
  it('C343334 MARC file import with creating a new mapping profiles, action profiles and job profile', { tags: [testTypes.smoke] }, () => {
    const collectionOfProfiles = [
      { mappingProfile: { typeValue: newMappingProfile.folioRecordTypeValue.instance },
        actionProfile: { typeValue: newActionProfile.folioRecordTypeValue.instance } },
      { mappingProfile: { typeValue: newMappingProfile.folioRecordTypeValue.holdings },
        actionProfile: { typeValue: newActionProfile.folioRecordTypeValue.holdings } },
      { mappingProfile: { typeValue: newMappingProfile.folioRecordTypeValue.item },
        actionProfile: { typeValue: newActionProfile.folioRecordTypeValue.item } }];

    const specialJobProfile = { ...newJobProfile.defaultJobProfile };
    specialJobProfile.acceptedDataType = newJobProfile.acceptedDataType.dataType;

    collectionOfProfiles.forEach(profile => {
      profile.mappingProfile.name = `autotest${profile.mappingProfile.typeValue}${getRandomPostfix()}`;
      profile.actionProfile.name = `autotest${profile.actionProfile.typeValue}${getRandomPostfix()}`;

      settingsDataImport.goToMappingProfile();
      fieldMappingProfiles.createMappingProfile(profile.mappingProfile);
      fieldMappingProfiles.checkMappingProfilePresented(profile.mappingProfile.name);
      settingsDataImport.goToActionProfile();
      actionProfiles.createActionProfile(profile.actionProfile, profile.mappingProfile);
      actionProfiles.checkActionProfilePresented(profile.actionProfile.name);
    });

    settingsDataImport.goToJobProfile();
    jobProfiles.createNewJobProfile();
    newJobProfile.fillJobProfile(specialJobProfile);
    collectionOfProfiles.map(element => element.actionProfile).forEach(actionProfile => {
      newJobProfile.selectActionProfile(actionProfile);
    });
    newJobProfile.clickSaveAndCloseButton();
    jobProfiles.waitLoadingList();
    jobProfiles.checkJobProfilePresented(specialJobProfile.profileName);

    dataImport.goToDataImport();
    dataImport.uploadFile(fileName);
    jobProfiles.searchJobProfileForImport(specialJobProfile.profileName);
    jobProfiles.runImportFile();
    dataImportLogs.checkImportFile(specialJobProfile.profileName);
    dataImportLogs.checkStatusOfJobProfile();
    dataImportLogs.openJobProfile();
    createdRecord.checkCreatedItems();
    // TODO delete created data
  });
});
