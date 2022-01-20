/// <reference types="cypress" />

import Agreements from '../../support/fragments/agreements/agreements';
import AgreementDetails from '../../support/fragments/agreements/agreementsDetails';
import TopMenu from '../../support/fragments/topMenu';
import NewNote from '../../support/fragments/notes/newNote';
import ExistingNoteView from '../../support/fragments/notes/existingNoteView';
import testTypes from '../../support/dictionary/testTypes';
import features from '../../support/dictionary/features';
import permissions from '../../support/dictionary/permissions';

describe('Note creation', () => {
  let userId = '';

  const longNote = { ...NewNote.defaultNote };
  //  title that is more than 65 characters but less than 250 characters
  longNote.title += String().padEnd(65 - longNote.title.length - 1, 'test');
  // Enter a note that is more than 4000 characters
  longNote.details += String().padEnd(4000 - longNote.details.length - 1, 'test');

  // need to use this method instead of before and beforeAll
  const initPrepairing = (specialPermissions) => {
    cy.createTempUser(specialPermissions).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      // TODO: move agreement creation into api requests
      cy.visit(TopMenu.agreementsPath);
      Agreements.waitLoading();
      Agreements.create();
      Agreements.selectRecord();
      AgreementDetails.openNotesSection();
    });
  };
  it('C1296 Create a note', { tags: [testTypes.smoke, features.notes] }, () => {
    initPrepairing([permissions.uiNotesItemCreate.gui, permissions.uiNotesItemView,
      // need access to special application( agreements in this case)
      permissions.uiAgreementsAgreementsEdit.gui]);
    AgreementDetails.createNote(longNote);
    Agreements.selectRecord();
    AgreementDetails.waitLoadingWithExistingNote(longNote.title);
    AgreementDetails.checkNotesCount(1);
    AgreementDetails.openNotesSection();
    AgreementDetails.specialNotePresented(longNote.title);
  });

  it('C1299 Edit a note', { tags: [testTypes.smoke, features.notes] }, () => {
    initPrepairing([permissions.uiNotesItemCreate.gui,
      permissions.uiNotesItemView.gui,
      permissions.uiNotesItemEdit.gui,
      // need access to special application( agreements in this case)
      permissions.uiAgreementsAgreementsEdit.gui]);
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

  it('C16992 View a note', { tags: [testTypes.smoke, features.notes] }, () => {
    initPrepairing([permissions.uiNotesItemCreate.gui,
      permissions.uiNotesItemView.gui,
      // need access to special application( agreements in this case)
      permissions.uiAgreementsAgreementsEdit.gui]);

    AgreementDetails.createNote(longNote);
    Agreements.selectRecord();
    AgreementDetails.waitLoadingWithExistingNote(longNote.title);
    AgreementDetails.openNotesSection();

    AgreementDetails.checkShortedNoteDetails(longNote.getShortDetails());
    AgreementDetails.checkNoteShowMoreLink(longNote.details);

    AgreementDetails.openNoteView(longNote);
    ExistingNoteView.waitLoading();
    ExistingNoteView.checkProperties(longNote);
    ExistingNoteView.close();
  });

  afterEach(() => {
    // TODO: add support of delete through api
    AgreementDetails.remove();
    cy.deleteUser(userId);
  });
});
