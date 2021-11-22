/* eslint-disable no-only-tests/no-only-tests */
/// <reference types="cypress" />

import Agreements from '../../support/fragments/agreements/agreements';
import AgreementDetails from '../../support/fragments/agreements/agreementsDetails';
import TopMenu from '../../support/fragments/topMenu';
import NewNote from '../../support/fragments/notes/newNote';
import ExistingNoteView from '../../support/fragments/notes/existingNoteView';

describe('Note creation', () => {
  before(() => {
    // TODO: add support of special permissions in special account
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    // TODO: move agreement creation into api requests
    cy.visit(TopMenu.agreementsPath);
    Agreements.waitLoading();
  });
  beforeEach(() => {
    Agreements.create();
    Agreements.selectRecord();
    AgreementDetails.openNotesSection();
  });
  it('C1296 Create a note', () => {
    const specialNote = { ...NewNote.defaultNote };
    //  title that is more than 65 characters but less than 250 characters
    specialNote.title += String().padEnd(65 - specialNote.title.length - 1, 'test');
    // Enter a note that is more than 4000 characters
    specialNote.details += String().padEnd(4000 - specialNote.details.length - 1, 'test');

    AgreementDetails.createNote(specialNote);
    Agreements.selectRecord();
    AgreementDetails.waitLoadingWithExistingNote(specialNote.title);
    AgreementDetails.checkNotesCount(1);
    AgreementDetails.openNotesSection();
    AgreementDetails.specialNotePresented(specialNote.title);
  });

  it('C1299 Edit a note', () => {
    const specialNote = NewNote.defaultNote;
    AgreementDetails.createNote(specialNote);
    Agreements.selectRecord();
    AgreementDetails.waitLoadingWithExistingNote(specialNote.title);
    AgreementDetails.openNotesSection();

    const updatedNote = { ...specialNote };
    updatedNote.title = `changed_${specialNote.title}`;
    updatedNote.details = `changed_${specialNote.details}`;

    AgreementDetails.editNote(specialNote.title, updatedNote);
    ExistingNoteView.checkProperties(updatedNote);

    ExistingNoteView.close();
    AgreementDetails.openNotesSection();
    AgreementDetails.specialNotePresented(updatedNote.title);
  });
  afterEach(() => {
    // TODO: add support of delete through api
    AgreementDetails.remove();
  });
});
