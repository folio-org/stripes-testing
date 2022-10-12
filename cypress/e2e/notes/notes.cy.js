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
import Users from '../../support/fragments/users/users';
import devTeams from '../../support/dictionary/devTeams';

describe('Note creation', () => {
  const specialNote = NewNote.defaultNote;
  const longNote = NewNote.defaultNote;
  const updatedNote = {
    title: `changed_${specialNote.title}`,
    details: `changed_${specialNote.details}`
  };
  const testData = {
    agreementTitle: NewAgreement.defaultAgreement.name
  };

  before('Creating user and agreement', () => {
    cy.getAdminToken();

    Agreements.createViaApi(testData.agreementTitle).then((res) => {
      testData.agreementProps = res.body;
    });

    cy.createTempUser([
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemEdit.gui,
      Permissions.uiAgreementsAgreementsEdit.gui,
      Permissions.uiAgreementsAgreementsDelete.gui,
      Permissions.uiAgreementsAgreementsView.gui,
      Permissions.uiRequestsView.gui,
    ]).then((resUserProperties) => {
      testData.user = resUserProperties;
      cy.login(resUserProperties.username, resUserProperties.password, { path: TopMenu.agreementsPath, waiter: Agreements.waitLoading });
    });
  });

  it('C1296 Create a note (spitfire)', { tags: [TestTypes.smoke, Features.notes, devTeams.spitfire] }, () => {
    Agreements.selectRecord(testData.agreementTitle);
    AgreementDetails.openNotesSection();
    AgreementDetails.createNote(longNote);
    Agreements.selectRecord(testData.agreementTitle);
    AgreementDetails.checkNotesCount(1);
    AgreementDetails.openNotesSection();
    AgreementDetails.waitLoadingWithExistingNote(longNote.title);
    AgreementDetails.specialNotePresented(longNote.title);
  });

  it('C16992 View a note (spitfire)', { tags: [TestTypes.smoke, Features.notes, devTeams.spitfire] }, () => {
    AgreementDetails.openNoteView(longNote);
    ExistingNoteView.checkProperties(longNote);
    ExistingNoteView.close();
    AgreementDetails.checkNotesCount(1);
  });

  it('C1299 Edit a note (spitfire)', { tags: [TestTypes.smoke, Features.notes, devTeams.spitfire] }, () => {
    AgreementDetails.openNotesSection();
    AgreementDetails.editNote(longNote.title, updatedNote);
    ExistingNoteView.checkProperties(updatedNote);

    ExistingNoteView.close();
    AgreementDetails.checkNotesCount(1);
    AgreementDetails.openNotesSection();
    AgreementDetails.specialNotePresented(updatedNote.title);
  });

  after('Deleting agreement and user', () => {
    Agreements.deleteViaApi(testData.agreementProps.id);
    Users.deleteViaApi(testData.user.userId);
  });
});
