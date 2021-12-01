/// <reference types="cypress" />

import fieldMappingProfiles from '../../support/fragments/data_import/fieldMappingProfiles';
import NewFieldMappingProfile from '../../support/fragments/data_import/newMappingProfile';
import TopMenu from '../../support/fragments/topMenu';


describe('ui-data-import: MARC file import with creating of the new instance, holding and item', () => {
    it('create a mapping profile for Instance', () => {
        cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
        cy.visit(TopMenu.settingsDataImportPath);

        fieldMappingProfiles.clickActionButton();
        fieldMappingProfiles.createNewMappingProfile();
        NewFieldMappingProfile.fill();


    });
});