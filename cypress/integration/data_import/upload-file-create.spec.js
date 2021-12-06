/// <reference types="cypress" />

import FieldMappingProfile from '../../support/fragments/data_import/fieldMappingProfile';
import FieldMappingProfiles from '../../support/fragments/data_import/fieldMappingProfiles';
import NewMappingProfile from '../../support/fragments/data_import/newMappingProfile';
import TopMenu from '../../support/fragments/topMenu';


describe('ui-data-import: MARC file import with creating of the new instance, holding and item', () => {
  beforeEach('navigates to Settings', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.settingsDataImportPath);
  });

  const collectionOfMappingProfiles = [NewMappingProfile.folioRecordTypeValue.instance,
    NewMappingProfile.folioRecordTypeValue.holdings,
    NewMappingProfile.folioRecordTypeValue.item];

  collectionOfMappingProfiles.forEach(mappingProfile => {
    it(`C343334 MARC file import with creating of the new ${mappingProfile}`, () => {
      const specialMappingProfile = { ...NewMappingProfile.defaultMappingProfile };
      specialMappingProfile.folioRecordType = mappingProfile;
      specialMappingProfile.profileName = `autotest FAT-742: ${mappingProfile} mapping profile`;

      FieldMappingProfiles.clickActionButton();
      FieldMappingProfiles.createNewMappingProfile();
      NewMappingProfile.fill(specialMappingProfile);
      NewMappingProfile.saveAndClose();
      FieldMappingProfiles.waitLoadingList();
      FieldMappingProfiles.specialMappingProfilePresented(specialMappingProfile.profileName);

      // FieldMappingProfiles.searchMappingProfile();
      // FieldMappingProfiles.waitLoadingMappingProfile();
      // FieldMappingProfiles.searchMappingProfile(specialMappingProfile.profileName);
      // FieldMappingProfile.clickActionButton();
      // FieldMappingProfile.deleteMappingProfile();
    });
  });
});
