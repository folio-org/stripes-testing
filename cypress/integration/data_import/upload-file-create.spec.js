/// <reference types="cypress" />

import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import SettingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';


describe('ui-data-import: MARC file import with creating of the new instance, holding and item', () => {
  before('navigates to Settings', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  const collectionOfProfiles = [
    { mappingProfile: NewMappingProfile.folioRecordTypeValue.instance,
      actionProfile: NewActionProfile.folioRecordTypeValue.instance,
      jobProfile: NewJobProfile.acceptedDatatype.dataType },
    { mappingProfile: NewMappingProfile.folioRecordTypeValue.holdings,
      actionProfile: NewActionProfile.folioRecordTypeValue.holdings },
    { mappingProfile: NewMappingProfile.folioRecordTypeValue.item,
      actionProfile: NewActionProfile.folioRecordTypeValue.item }
  ];

  collectionOfProfiles.forEach(profile => {
    it(`C343334 MARC file import with creating a new ${profile.mappingProfile} mapping profile and ${profile.actionProfile} action profile`, () => {
      const specialMappingProfile = { ...NewMappingProfile.defaultMappingProfile };
      specialMappingProfile.folioRecordTypeMapping = profile.mappingProfile;
      specialMappingProfile.profileName = `autotest FAT-742: ${profile.mappingProfile} mapping profile`;

      const specialActionProfile = { ...NewActionProfile.defaultActionProfile };
      specialActionProfile.folioRecordTypeAction = profile.actionProfile;
      specialActionProfile.profileName = `autotest FAT-742: ${profile.actionProfile} action profile`;

      const specialJobProfile = { ...NewJobProfile.defaultJobProfile };
      specialJobProfile.acceptedDataType = profile.jobProfile;

      SettingsDataImport.goToMappingProfile();
      FieldMappingProfiles.createNewMappingProfile();
      NewMappingProfile.fill(specialMappingProfile);
      NewMappingProfile.saveAndClose();
      FieldMappingProfiles.waitLoadingList();
      FieldMappingProfiles.specialMappingProfilePresented(specialMappingProfile.profileName);

      SettingsDataImport.goToActionProfile();
      ActionProfiles.createNewActionProfile();
      NewActionProfile.fill(specialActionProfile);
      NewActionProfile.linkMappingProfile(specialMappingProfile);
      ActionProfiles.specialActionProfilePresented(specialActionProfile.profileName);

      SettingsDataImport.goToJobProfile();
      JobProfiles.clickButton();
      JobProfiles.createNewJobProfile();
      NewJobProfile.fill(specialJobProfile);
      NewJobProfile.selectActionProfile(specialActionProfile);
      cy.pause();
      NewJobProfile.clickSaveAndClose();
      JobProfiles.waitLoadingList();
      JobProfiles.specialJobProfilePresented(specialJobProfile.profileName);
    });
  });
});
