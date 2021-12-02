/// <reference types="cypress" />

import { set } from 'lodash';
import fieldMappingProfiles from '../../support/fragments/data_import/fieldMappingProfiles';
import NewMappingProfile from '../../support/fragments/data_import/newMappingProfile';
import TopMenu from '../../support/fragments/topMenu';


describe('ui-data-import: MARC file import with creating of the new instance, holding and item', () => {

    const collectionOfMappingProfiles = [NewMappingProfile.defaultMappingProfile.folioRecordType];

    collectionOfMappingProfiles.forEach(mappingProfile => {
        it('create a mapping profile for Instance', () => {
//
            const specialMappingProfile = {... NewMappingProfile.defaultMappingProfile};
            specialMappingProfile.folioRecordType = mappingProfile;
            

            cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
            cy.visit(TopMenu.settingsDataImportPath);

            fieldMappingProfiles.clickActionButton();
            fieldMappingProfiles.createNewMappingProfile();
            NewMappingProfile.fill(specialMappingProfile);
            NewMappingProfile.saveAndClose();





        });
    });




});