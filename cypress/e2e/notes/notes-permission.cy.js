import Permissions from '../../support/dictionary/permissions';
import NotesEholdings from '../../support/fragments/notes/notesEholdings';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Notes', () => {
  const testData = {};
  const urlToEholdings = '/eholdings/providers/38';
  const note = {
    title: `Test Title ${getRandomPostfix()}`,
    details: `Test details ${getRandomPostfix()}`,
  };

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.uiNotesItemView.gui,
      Permissions.moduleeHoldingsEnabled.gui,
    ]).then((createdUserProperties) => {
      testData.viewUserProperties = createdUserProperties;
    });

    cy.createTempUser([
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemEdit.gui,
      Permissions.uiNotesItemDelete.gui,
      Permissions.moduleeHoldingsEnabled.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: urlToEholdings,
        waiter: NotesEholdings.waitLoading,
        authRefresh: true,
      });
    });
  });

  after('Deleting data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    Users.deleteViaApi(testData.viewUserProperties.userId);
  });

  it(
    'C527 Notes: Can create notes (spitfire)',
    { tags: ['criticalPath', 'spitfire', 'shiftLeft', 'C527'] },
    () => {
      NotesEholdings.createNote(note.title, note.details);
      NotesEholdings.verifyNoteCreation(note.title, note.details);
      NotesEholdings.openNoteView(note.title, note.details);
      NotesEholdings.deleteNote();
    },
  );

  it(
    'C1245 Notes: Can view notes (spitfire)',
    { tags: ['criticalPath', 'spitfire', 'shiftLeft', 'C1245'] },
    () => {
      NotesEholdings.createNote(note.title, note.details);
      NotesEholdings.verifyNoteCreation(note.title, note.details);

      cy.login(testData.viewUserProperties.username, testData.viewUserProperties.password, {
        path: urlToEholdings,
        waiter: NotesEholdings.waitLoading,
        authRefresh: true,
      });
      NotesEholdings.verifyNoteVisibilityWithViewPermission(note.title, note.details);
      NotesEholdings.openNoteView(note.title, note.details);
      NotesEholdings.verifyActionButtonVisibilityWithViewPermission();

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: urlToEholdings,
        waiter: NotesEholdings.waitLoading,
        authRefresh: true,
      });
      NotesEholdings.openNoteView(note.title, note.details);
      NotesEholdings.deleteNote();
    },
  );

  it(
    'C526 Notes: Can edit a note (spitfire)',
    { tags: ['criticalPath', 'spitfire', 'shiftLeft', 'C526'] },
    () => {
      const newNote = {
        title: `Changed Title ${getRandomPostfix()}`,
        details: `Changed details ${getRandomPostfix()}`,
      };
      NotesEholdings.createNote(note.title, note.details);
      NotesEholdings.editNote(note.title, newNote.title, newNote.details);
      NotesEholdings.verifyNoteTitle(newNote.title);
      NotesEholdings.openNoteView(newNote.title);
      NotesEholdings.deleteNote();
    },
  );

  it(
    'C528 Notes: Can delete notes (spitfire)',
    { tags: ['criticalPath', 'spitfire', 'shiftLeft', 'C528'] },
    () => {
      NotesEholdings.createNote(note.title, note.details);
      NotesEholdings.verifyNoteCreation(note.title, note.details);
      NotesEholdings.openNoteView(note.title, note.details);
      NotesEholdings.deleteNote();
      NotesEholdings.verifyNoteDeletion(note.title, note.details);
    },
  );
});
