/// <reference types="cypress" />

import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import SettingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import getRandomPostfix from '../../support/utils/stringTools';
import dataImport from '../../support/fragments/data_import/dataImport';
import logs from '../../support/fragments/data_import/logs';
import jobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import testTypes from '../../support/dictionary/testTypes';

describe('ui-data-import: MARC file import with creating of the new instance, holding and item', () => {
  // unique file name to upload
  const fileName = `autotestFile.${getRandomPostfix()}.mrc`;

  before('navigates to Settings', () => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
  });

  it('C343334 MARC file import with creating a new mapping profiles, action profiles and job profile', { tags: [testTypes.smoke] }, () => {
    const collectionOfProfiles = [
      {
        mappingProfile: { typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance },
        actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance }
      },
      {
        mappingProfile: {
          typeValue : NewFieldMappingProfile.folioRecordTypeValue.holdings,
          location: NewFieldMappingProfile.permanentLocation.permanentLocation
        },
        actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings }
      },
      {
        mappingProfile: {
          typeValue : NewFieldMappingProfile.folioRecordTypeValue.item,
          material: NewFieldMappingProfile.materialType.materialType,
          loan: NewFieldMappingProfile.permanentLoanType.type,
          status: NewFieldMappingProfile.statusField.status
        },
        actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item }
      }
    ];

    const specialJobProfile = { ...NewJobProfile.defaultJobProfile };

    collectionOfProfiles.forEach(profile => {
      profile.mappingProfile.name = `autotest${profile.mappingProfile.typeValue}${getRandomPostfix()}`;
      profile.actionProfile.name = `autotest${profile.actionProfile.typeValue}${getRandomPostfix()}`;

      SettingsDataImport.goToMappingProfiles();
      FieldMappingProfiles.createMappingProfile(profile.mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(profile.mappingProfile.name);
      SettingsDataImport.goToActionProfiles();
      ActionProfiles.createActionProfile(profile.actionProfile, profile.mappingProfile);
      ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
    });

    SettingsDataImport.goToJobProfiles();
    jobProfiles.openNewJobProfileForm();
    NewJobProfile.fillJobProfile(specialJobProfile);
    collectionOfProfiles.forEach(({ actionProfile }) => {
      NewJobProfile.linkActionProfile(actionProfile);
    });
    NewJobProfile.clickSaveAndCloseButton();
    jobProfiles.waitLoadingList();
    jobProfiles.checkJobProfilePresented(specialJobProfile.profileName);

    dataImport.goToDataImport();
    dataImport.uploadFile(fileName);
    jobProfiles.searchJobProfileForImport(specialJobProfile.profileName);
    jobProfiles.runImportFile(fileName);
    logs.checkImportFile(specialJobProfile.profileName);
    logs.checkStatusOfJobProfile();
    logs.openJobProfile(fileName);
    logs.checkCreatedItems();
    // TODO delete created data
  });
});
