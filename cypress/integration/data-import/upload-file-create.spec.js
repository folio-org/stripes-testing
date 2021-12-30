
/// <reference types="cypress" />

import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import NewFieldMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import SettingsDataImport from '../../support/fragments/data_import/settingsDataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import getRandomPostfix from '../../support/utils/stringTools';
import { testType } from '../../support/utils/tagTools';

describe('ui-data-import: MARC file import with creating of the new instance, holding and item', () => {
  before('navigates to Settings', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });
  it('C343334 MARC file import with creating a new mapping profile and action profile', { tags: [testType.smoke] }, () => {
    const collectionOfProfiles = [
      { mappingProfile: { typeValue : NewFieldMappingProfile.folioRecordTypeValue.instance },
        actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance } },
      { mappingProfile: { typeValue : NewFieldMappingProfile.folioRecordTypeValue.holdings,
        location: NewFieldMappingProfile.permanentLocation.permanentLocation },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings } },
      { mappingProfile: { typeValue : NewFieldMappingProfile.folioRecordTypeValue.item,
        material: NewFieldMappingProfile.materialType.materialType,
        loan: NewFieldMappingProfile.permanentLoanType.type,
        status: NewFieldMappingProfile.statusField.status },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item } }];

    const specialJobProfile = { ...NewJobProfile.defaultJobProfile };
    specialJobProfile.acceptedDataType = NewJobProfile.acceptedDataType.dataType;

    collectionOfProfiles.forEach(profile => {
      profile.mappingProfile.name = `autotest${profile.mappingProfile.typeValue}${getRandomPostfix()}`;
      profile.actionProfile.name = `autotest${profile.actionProfile.typeValue}${getRandomPostfix()}`;

      SettingsDataImport.goToMappingProfile();
      FieldMappingProfiles.create(profile.mappingProfile);
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

    // TODO delete created data
  });
});

