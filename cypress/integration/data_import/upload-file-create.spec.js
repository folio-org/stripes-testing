/// <reference types="cypress" />

import fieldMappingProfiles from '../../support/fragments/data_import/fieldMappingProfiles';
import NewMappingProfile from '../../support/fragments/data_import/newMappingProfile';
import TopMenu from '../../support/fragments/topMenu';


describe('ui-data-import: MARC file import with creating of the new instance, holding and item', () => {
  beforeEach('navigates to Settings', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.settingsDataImportPath);
  });

  const collectionOfMappingProfiles = [NewMappingProfile.defaultMappingProfile.folioRecordType, NewMappingProfile.defaultMappingProfile.folioRecordType, NewMappingProfile.defaultMappingProfile.folioRecordType];

  collectionOfMappingProfiles.forEach(mappingProfile => {
    it(`C343334 create a mapping profile for ${mappingProfile}`, () => {
      const specialMappingProfile = { ...NewMappingProfile.defaultMappingProfile };
      specialMappingProfile.folioRecordType = mappingProfile;

      fieldMappingProfiles.clickActionButton();
      fieldMappingProfiles.createNewMappingProfile();
      NewMappingProfile.fill(specialMappingProfile);
      NewMappingProfile.saveAndClose();
    });
  });
});
