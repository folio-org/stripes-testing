/// <reference types="cypress" />

import FieldMappingProfiles from '../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMappingProfile from '../../support/fragments/data_import/mapping_profiles/newMappingProfile';
import ActionProfiles from '../../support/fragments/data_import/action_profiles/actionProfiles';
import SettingsDataImport from '../../support/fragments/data_import/settingsDataImport';


describe('ui-data-import: MARC file import with creating of the new instance, holding and item', () => {
  before('navigates to Settings', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  const collectionOfMappingProfiles = [NewMappingProfile.folioRecordTypeValue.instance,
    NewMappingProfile.folioRecordTypeValue.holdings,
    NewMappingProfile.folioRecordTypeValue.item];

  collectionOfMappingProfiles.forEach(mappingProfile => {
    it(`C343334 MARC file import with creating a new ${mappingProfile} mapping profile`, () => {
      const specialMappingProfile = { ...NewMappingProfile.defaultMappingProfile };
      specialMappingProfile.folioRecordType = mappingProfile;
      specialMappingProfile.profileName = `autotest FAT-742: ${mappingProfile} mapping profile`;

      SettingsDataImport.goToMappingProfile();
      FieldMappingProfiles.clickActionButton();
      FieldMappingProfiles.createNewMappingProfile();
      NewMappingProfile.fill(specialMappingProfile);
      NewMappingProfile.saveAndClose();
      FieldMappingProfiles.waitLoadingList();
      FieldMappingProfiles.specialMappingProfilePresented(specialMappingProfile.profileName);
    });
  });

  const collectionOfActionProfiles = [NewActionProfile.folioRecordTypeValue.instance,
    NewActionProfile.folioRecordTypeValue.holdings,
    NewActionProfile.folioRecordTypeValue.item];

  collectionOfActionProfiles.forEach(actionProfile => {
    it(`C343334 MARC file import with creating a new ${actionProfile} action profile`, () => {
      const specialActionProfile = { ...NewActionProfile.defaultActionProfile };
      specialActionProfile.folioRecordType = actionProfile;
      specialActionProfile.profileName = `autotest FAT-742: ${actionProfile} action profile`;

      SettingsDataImport.goToActionProfile();
      ActionProfiles.clickActionButton();
      ActionProfiles.createNewActionProfile();
      NewActionProfile.fill(specialActionProfile);

      NewActionProfile.saveAndClose();
    });
  });
});
