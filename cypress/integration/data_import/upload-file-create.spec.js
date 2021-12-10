/// <reference types="cypress" />

import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import SettingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import getRandomPostfix from '../../support/utils/stringTools';


describe('ui-data-import: MARC file import with creating of the new instance, holding and item', () => {
  before('navigates to Settings', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C343334 MARC file import with creating a new mapping profile and action profile', () => {
    const collectionOfProfiles = [
      { mappingProfile: { typeValue : NewMappingProfile.folioRecordTypeValue.instance,
        name: `autotest${NewMappingProfile.folioRecordTypeValue.instance}${getRandomPostfix()}` },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance,
        name: `autotest${NewActionProfile.folioRecordTypeValue.instance}${getRandomPostfix()}` } },
      { mappingProfile: { typeValue : NewMappingProfile.folioRecordTypeValue.holdings,
        name: `autotest${NewMappingProfile.folioRecordTypeValue.holdings}${getRandomPostfix()}` },
      actionProfile:{ typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: `autotest${NewActionProfile.folioRecordTypeValue.holdings}${getRandomPostfix()}` } },
      { mappingProfile: { typeValue : NewMappingProfile.folioRecordTypeValue.item,
        name: `autotest${NewMappingProfile.folioRecordTypeValue.item}${getRandomPostfix()}` },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: `autotest${NewActionProfile.folioRecordTypeValue.item}${getRandomPostfix()}` } }

    ];

    collectionOfProfiles.forEach(profile => {
      // const specialMappingProfile = { ...NewMappingProfile.defaultMappingProfile };
      // specialMappingProfile.folioRecordTypeMapping = profile.mappingProfile;
      // specialMappingProfile.profileName = `autotest FAT-742: ${profile.mappingProfile} mapping profile`;

      // const specialActionProfile = { ...NewActionProfile.defaultActionProfile };
      // specialActionProfile.folioRecordTypeAction = profile.actionProfile;
      // specialActionProfile.profileName = `autotest FAT-742: ${profile.actionProfile} action profile`;

      SettingsDataImport.goToMappingProfile();
      FieldMappingProfiles.createNewMappingProfile();
      NewMappingProfile.fill(profile.mappingProfile);
      NewMappingProfile.saveAndClose();
      FieldMappingProfiles.specialMappingProfilePresented(profile.mappingProfile);

      SettingsDataImport.goToActionProfile();
      ActionProfiles.createNewActionProfile();
      NewActionProfile.fill(profile.actionProfile);
      NewActionProfile.linkMappingProfile(profile.mappingProfile);
      ActionProfiles.specialActionProfilePresented(profile.actionProfile);
    });

    const specialJobProfile = { ...NewJobProfile.defaultJobProfile };
    const jobProfile = NewJobProfile.acceptedDatatype.dataType;
    specialJobProfile.acceptedDataType = jobProfile;

    SettingsDataImport.goToJobProfile();
    JobProfiles.clickButton();
    JobProfiles.createNewJobProfile();
    NewJobProfile.fill(specialJobProfile);
    collectionOfProfiles.map(element => element.actionProfile).forEach(actionProfile => {
      NewJobProfile.selectActionProfile(actionProfile);
    });
    NewJobProfile.clickSaveAndClose();
    JobProfiles.waitLoadingList();
    JobProfiles.specialJobProfilePresented(specialJobProfile.profileName);
  });



  // it(`C343334 MARC file import with creating a new ${jobProfile} job profile`, () => {

  // });
});
