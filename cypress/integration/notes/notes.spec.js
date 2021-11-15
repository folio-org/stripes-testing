/// <reference types="cypress" />

import Agreements from '../../support/fragments/agreements/Agreements';
import AgreementDetails from '../../support/fragments/agreements/agreementsDetails';
import TopMenu from '../../support/fragments/topMenu';
import NewNote from '../../support/fragments/notes/newNote';

const specialNote = NewNote.defaultNote;
//  title that is more than 65 characters but less than 250 characters
specialNote.title += String().padEnd(65 - specialNote.title.length - 1, 'test');
// Enter a note that is more than 4000 characters
specialNote.details += String().padEnd(4000 - specialNote.details.length - 1, 'test');


describe('Note creation', () => {
  it('C1296 Create into Agreement', () => {
    // TODO: add support of special permissions in special account
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    // TODO: move agreement creation into api requests
    cy.visit(TopMenu.agreementsPath);
    Agreements.create();
    Agreements.selectRecord();
    AgreementDetails.openNotesSection();


    AgreementDetails.createNote(specialNote);
    Agreements.selectRecord();
    AgreementDetails.checkNotesCount(1);
    AgreementDetails.openNotesSection();
    AgreementDetails.specialNotePresented(specialNote.title);
    // TODO: add support of delete through api
    AgreementDetails.remove();
  });
});
