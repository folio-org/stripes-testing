/// <reference types="cypress" />

import fieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import newActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import newMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import actionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import settingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import newJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import getRandomPostfix from '../../support/utils/stringTools';
import dataImport from '../../support/fragments/data_import/dataImport';
import logs from '../../support/fragments/data_import/logs';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import testTypes from '../../support/dictionary/testTypes';

describe('ui-data-import: MARC file import with creating of the new instance, holding and item', () => {
  // unique file name to upload
  const fileName = `autotestFile.${getRandomPostfix()}.mrc`;

  // unique profile names
  const jobProfileName = `autotestJobProf${getRandomPostfix()}`;
  const actionProfileNameForInstance = `autotestActionInstance${getRandomPostfix()}`;
  const actionProfileNameForHoldings = `autotestActionHoldings${getRandomPostfix()}`;
  const actionProfileNameForItem = `autotestActionItem${getRandomPostfix()}`;
  const mappingProfileNameForInstance = `autotestMappingInstance${getRandomPostfix()}`;
  const mappingProfileNameForHoldings = `autotestMappingHoldings${getRandomPostfix()}`;
  const mappingProfileNameForItem = `autotestMappingItem${getRandomPostfix()}`;

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

  it('C343334 MARC file import with creating a new mapping profiles, action profiles and job profile', { tags: [testTypes.smoke] }, () => {
    const collectionOfProfiles = [
      {
        mappingProfile: { typeValue : newMappingProfile.folioRecordTypeValue.instance,
          name: mappingProfileNameForInstance },
        actionProfile: { typeValue: newActionProfile.folioRecordTypeValue.instance,
          name: actionProfileNameForInstance }
      },
      {
        mappingProfile: { typeValue : newMappingProfile.folioRecordTypeValue.holdings,
          name: mappingProfileNameForHoldings },
        actionProfile: { typeValue: newActionProfile.folioRecordTypeValue.holdings,
          name: actionProfileNameForHoldings }
      },
      {
        mappingProfile: { typeValue : newMappingProfile.folioRecordTypeValue.item,
          name: mappingProfileNameForItem },
        actionProfile: { typeValue: newActionProfile.folioRecordTypeValue.item,
          name: actionProfileNameForItem }
      }
    ];

    const specialJobProfile = { ...newJobProfile.defaultJobProfile,
      profileName: jobProfileName };

    collectionOfProfiles.forEach(profile => {
      settingsDataImport.goToMappingProfiles();
      fieldMappingProfiles.createMappingProfile(profile.mappingProfile);
      fieldMappingProfiles.checkMappingProfilePresented(profile.mappingProfile.name);
      settingsDataImport.goToActionProfiles();
      actionProfiles.createActionProfile(profile.actionProfile.name, profile.mappingProfile.name);
      actionProfiles.checkActionProfilePresented(profile.actionProfile.name);
    });

    settingsDataImport.goToJobProfiles();
    jobProfiles.createJobProfile(specialJobProfile);
    collectionOfProfiles.forEach(profile => {
      newJobProfile.linkActionProfile(profile.actionProfile.name);
    });
    newJobProfile.clickSaveAndCloseButton();
    jobProfiles.checkJobProfilePresented(specialJobProfile.profileName);

    dataImport.goToDataImport();
    dataImport.uploadFile(fileName);
    jobProfiles.searchJobProfileForImport(specialJobProfile.profileName);
    jobProfiles.runImportFile(fileName);
    logs.checkImportFile(specialJobProfile.profileName);
    logs.checkStatusOfJobProfile();
    logs.openJobProfile(fileName);
    logs.checkCreatedItems();

    // delete generated profiles
    jobProfiles.deleteJobProfile(jobProfileName);
    collectionOfProfiles.forEach(profile => {
      actionProfiles.deleteActionProfile(profile.actionProfile.name);
      fieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
  });
});
