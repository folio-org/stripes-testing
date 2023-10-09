import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import NotesEholdings from '../../support/fragments/notes/notesEholdings';
import Users from '../../support/fragments/users/users';

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
      });
    });
  });

  after('Deleting data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    Users.deleteViaApi(testData.viewUserProperties.userId);
  });

  it(
    'C527 Notes: Can create notes (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      NotesEholdings.createNote(note.title, note.details);
      NotesEholdings.verifyNoteCreation(note.title, note.details);
      NotesEholdings.openNoteView(note.title, note.details);
      NotesEholdings.deleteNote();
    },
  );

  it(
    'C1245 Notes: Can view notes (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      NotesEholdings.createNote(note.title, note.details);
      NotesEholdings.verifyNoteCreation(note.title, note.details);

      cy.login(testData.viewUserProperties.username, testData.viewUserProperties.password, {
        path: urlToEholdings,
        waiter: NotesEholdings.waitLoading,
      });
      NotesEholdings.verifyNoteVisibilityWithViewPermission(note.title, note.details);
      NotesEholdings.openNoteView(note.title, note.details);
      NotesEholdings.verifyActionButtonVisibilityWithViewPermission();

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: urlToEholdings,
        waiter: NotesEholdings.waitLoading,
      });
      NotesEholdings.openNoteView(note.title, note.details);
      NotesEholdings.deleteNote();
    },
  );

  it(
    'C526 Notes: Can edit a note (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
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
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      NotesEholdings.createNote(note.title, note.details);
      NotesEholdings.verifyNoteCreation(note.title, note.details);
      NotesEholdings.openNoteView(note.title, note.details);
      NotesEholdings.deleteNote();
      NotesEholdings.verifyNoteDeletion(note.title, note.details);
    },
  );
});
