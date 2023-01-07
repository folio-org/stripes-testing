import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import NotesEholdings from '../../support/fragments/notes/notesEholdings'
import Users from '../../support/fragments/users/users';

describe('Note creation', () => {
  const testData = {};
  const urlToEholdings = '/eholdings/providers/38';
  const note = {
    title: `Test Title ${getRandomPostfix()}`,
    details: `Test details ${getRandomPostfix()}`,
  }

  note.title += String().padEnd(65 - note.title.length - 1, 'test');
  note.details += String().padEnd(4000 - note.details.length - 1, 'test');

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.uiNotesItemView.gui,
      Permissions.moduleeHoldingsEnabled.gui,
    ]).then(createdUserProperties => {
      testData.viewUserProperties = createdUserProperties;
    });

    cy.createTempUser([
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemEdit.gui,
      Permissions.uiNotesItemDelete.gui,
      Permissions.moduleeHoldingsEnabled.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;

      cy.login(testData.userProperties.username, testData.userProperties.password, { path: urlToEholdings, waiter: NotesEholdings.waitLoading });
    });
  });

  after('Deleting data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    Users.deleteViaApi(testData.viewUserProperties.userId);
  });

  it('C1296 Create a note (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    NotesEholdings.createNote(note.title, note.details);
    NotesEholdings.verifyNoteTitle(note.title);
    NotesEholdings.openNoteView(note.title);
    NotesEholdings.deleteNote();
  });

  it('C1299 Edit a note (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    const newNote = {
      title: `Changed Title ${getRandomPostfix()}`,
      details: `Changed details ${getRandomPostfix()}`,
    }
    NotesEholdings.createNote(note.title, note.details);
    NotesEholdings.editNote(note.title, newNote.title, newNote.details);
    NotesEholdings.verifyNoteTitle(newNote.title);
    NotesEholdings.openNoteView(newNote.title);
    NotesEholdings.deleteNote();
  });

  it('C16992 View a note (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    NotesEholdings.createNote(note.title, note.details);
    NotesEholdings.verifyNoteTitle(note.title);
    NotesEholdings.openNoteView(note.title);
    NotesEholdings.deleteNote();
  });
});
