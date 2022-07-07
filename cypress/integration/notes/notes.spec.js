/// <reference types="cypress" />

import Agreements from '../../support/fragments/agreements/agreements';
import AgreementDetails from '../../support/fragments/agreements/agreementsDetails';
import TopMenu from '../../support/fragments/topMenu';
import NewNote from '../../support/fragments/notes/newNote';
import ExistingNoteView from '../../support/fragments/notes/existingNoteView';
import TestTypes from '../../support/dictionary/testTypes';
import Features from '../../support/dictionary/features';
import Permissions from '../../support/dictionary/permissions';
import NewAgreement from '../../support/fragments/agreements/newAgreement';
import { getLongDelay } from '../../support/utils/cypressTools';
import Users from '../../support/fragments/users/users';

describe('Note creation', () => {
  let userId;
  const agreementTitle = NewAgreement.defaultAgreement.name;

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
  it('C1296 Create a note', { tags: [TestTypes.smoke, Features.notes] }, () => {
    initPrepairing([Permissions.uiNotesItemCreate.gui, Permissions.uiNotesItemView,
      // need access to special application( agreements in this case)
      Permissions.uiAgreementsAgreementsEdit.gui, Permissions.uiAgreementsAgreementsDelete.gui]);
    AgreementDetails.createNote(longNote);
    Agreements.selectRecord();
    AgreementDetails.checkNotesCount(1);
    AgreementDetails.openNotesSection();
    AgreementDetails.waitLoadingWithExistingNote(longNote.title);
    AgreementDetails.specialNotePresented(longNote.title);
  });

  it('C1299 Edit a note', { tags: [TestTypes.smoke, Features.notes] }, () => {
    initPrepairing([Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemEdit.gui,
      // need access to special application( agreements in this case)
      Permissions.uiAgreementsAgreementsEdit.gui, Permissions.uiAgreementsAgreementsDelete.gui]);
    const specialNote = NewNote.defaultNote;
    AgreementDetails.createNote(specialNote);
    Agreements.selectRecord();
    AgreementDetails.checkNotesCount(1);
    AgreementDetails.openNotesSection();
    AgreementDetails.waitLoadingWithExistingNote(specialNote.title);

    const updatedNote = { ...specialNote };
    updatedNote.title = `changed_${specialNote.title}`;
    updatedNote.details = `changed_${specialNote.details}`;

    AgreementDetails.editNote(specialNote.title, updatedNote);
    ExistingNoteView.checkProperties(updatedNote);

    ExistingNoteView.close();
    AgreementDetails.checkNotesCount(1);
    AgreementDetails.openNotesSection();
    AgreementDetails.specialNotePresented(updatedNote.title);
  });

  it('C16992 View a note', { tags: [TestTypes.smoke, Features.notes] }, () => {
    initPrepairing([Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      // need access to special application( agreements in this case)
      Permissions.uiAgreementsAgreementsEdit.gui, Permissions.uiAgreementsAgreementsDelete.gui]);

    AgreementDetails.createNote(longNote);
    Agreements.selectRecord();
    AgreementDetails.checkNotesCount(1);
    AgreementDetails.openNotesSection();
    AgreementDetails.waitLoadingWithExistingNote(longNote.title);

    AgreementDetails.checkShortedNoteDetails(longNote.getShortDetails());
    AgreementDetails.checkNoteShowMoreLink(longNote.details);

    AgreementDetails.openNoteView(longNote);
    ExistingNoteView.waitLoading();
    ExistingNoteView.checkProperties(longNote);
    cy.intercept('note-types?**').as('noteTypesLoading');
    cy.intercept('note-links/domain/agreements/type/agreement/id/**').as('notesLoading');
    ExistingNoteView.close();
    cy.wait(['@notesLoading', '@noteTypesLoading'], getLongDelay());
    AgreementDetails.checkNotesCount(1);
  });

  afterEach(() => {
    // TODO: add support of delete through api
    AgreementDetails.remove();
    Agreements.waitLoading();
    Agreements.agreementNotVisible(agreementTitle);
    Users.deleteViaApi(userId);
  });
});
