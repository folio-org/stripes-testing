import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import NotesEholdings from '../../support/fragments/notes/notesEholdings'
import Users from '../../support/fragments/users/users';

describe('MARC Authority management', () => {
  const testData = {};
  const urlToEholdings = '/eholdings/providers/38';
  const note = {
    title: 'Test Title',
    details: `Test details ${getRandomPostfix()}`,
  }

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemEdit.gui,
      Permissions.uiNotesItemDelete.gui,
      Permissions.moduleeHoldingsEnabled.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
      cy.login(testData.userProperties.username, testData.userProperties.password);
    });
  });

  after('Deleting data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it('C1300 Delete a note (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    cy.visit(urlToEholdings);
    
    NotesEholdings.waitLoading();
    NotesEholdings.createNote(note.title, note.details);
    NotesEholdings.verifyNoteCreation(note.title, note.details);
    NotesEholdings.openNoteView(note.title, note.details);
    NotesEholdings.deleteNote();
    NotesEholdings.verifyNoteDeletion(note.title, note.details);
  });
});
