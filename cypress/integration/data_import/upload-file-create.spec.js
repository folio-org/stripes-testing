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
        name: `autotest${NewMappingProfile.folioRecordTypeValue.holdings}${getRandomPostfix()}`,
        location: NewMappingProfile.permanentLocation.location },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: `autotest${NewActionProfile.folioRecordTypeValue.holdings}${getRandomPostfix()}` } },
      { mappingProfile: { typeValue : NewMappingProfile.folioRecordTypeValue.item,
        name: `autotest${NewMappingProfile.folioRecordTypeValue.item}${getRandomPostfix()}`,
        material: NewMappingProfile.materialType.materialType,
        loan: NewMappingProfile.permanentLoanType.type,
        status: NewMappingProfile.status.status },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: `autotest${NewActionProfile.folioRecordTypeValue.item}${getRandomPostfix()}` } }];

    const specialJobProfile = { ...NewJobProfile.defaultJobProfile };
    const jobProfile = NewJobProfile.acceptedDataType.dataType;
    specialJobProfile.acceptedDataType = jobProfile;

    collectionOfProfiles.forEach(profile => {
      SettingsDataImport.goToMappingProfile();
      FieldMappingProfiles.createNewMappingProfile();
      NewMappingProfile.fillMappingProfile(profile.mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(profile.mappingProfile);

      SettingsDataImport.goToActionProfile();
      ActionProfiles.createNewActionProfile();
      NewActionProfile.fillActionProfile(profile.actionProfile);
      NewActionProfile.linkMappingProfile(profile.mappingProfile);
      ActionProfiles.checkActionProfilePresented(profile.actionProfile);
    });

    SettingsDataImport.goToJobProfile();
    JobProfiles.createNewJobProfile();
    NewJobProfile.fillJobProfile(specialJobProfile);
    collectionOfProfiles.map(element => element.actionProfile).forEach(actionProfile => {
      NewJobProfile.selectActionProfile(actionProfile);
    });
    NewJobProfile.clickSaveAndCloseButton();
    JobProfiles.waitLoadingList();
    JobProfiles.checkJobProfilePresented(specialJobProfile.profileName);
  });
});
