/// <reference types="cypress" />
// TODO: recheck that classes has the same name as js files
import fieldMappingProfiles from '../../support/fragments/data_import/fieldMappingProfiles';
import NewMappingProfile from '../../support/fragments/data_import/newMappingProfile';
import TopMenu from '../../support/fragments/topMenu';


describe('ui-data-import: MARC file import with creating of the new instance, holding and item', () => {
  const collectionOfMappingProfiles = [NewMappingProfile.defaultMappingProfile.folioRecordType];

  collectionOfMappingProfiles.forEach(mappingProfile => {
    // TODO: add testid from Testrail
    it(`create a mapping profile for ${mappingProfile}`, () => {
      const specialMappingProfile = { ...NewMappingProfile.defaultMappingProfile };
      specialMappingProfile.folioRecordType = mappingProfile;

      // TODO: move to beforeEach
      cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
      cy.visit(TopMenu.settingsDataImportPath);

      fieldMappingProfiles.clickActionButton();
      fieldMappingProfiles.createNewMappingProfile();
      NewMappingProfile.fill(specialMappingProfile);
      NewMappingProfile.saveAndClose();
    });
  });
});
