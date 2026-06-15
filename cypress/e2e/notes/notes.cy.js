import Permissions from '../../support/dictionary/permissions';
import NotesEholdings from '../../support/fragments/notes/notesEholdings';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Note creation', () => {
  const testData = {};
  const urlsToEholdings = [
    '/eholdings/providers/38',
    '/eholdings/providers/769',
    '/eholdings/providers/128077',
    '/eholdings/providers/57145',
  ];

  beforeEach('Creating data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemEdit.gui,
      Permissions.uiNotesItemDelete.gui,
      Permissions.moduleeHoldingsEnabled.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
    });
  });

  afterEach('Deleting data', () => {
    cy.wait(3000);
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties?.userId);
    Users.deleteViaApi(testData.deletedUserProperties?.userId);
  });

  it(
    'C1296 Create a note (spitfire)',
    { tags: ['smoke', 'spitfire', 'shiftLeft', 'C1296'] },
    () => {
      const note = {
        title: `AT_C1296_Note ${getRandomPostfix()}`,
        details: `AT_C1296_NoteDescription ${getRandomPostfix()}`,
      };
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: urlsToEholdings[0],
        waiter: NotesEholdings.waitLoading,
      });
      NotesEholdings.createNote(note.title, note.details);
      NotesEholdings.verifyNoteTitle(note.title);
      NotesEholdings.openNoteView(note.title);
      NotesEholdings.deleteNote();
    },
  );

  it('C1299 Edit a note (spitfire)', { tags: ['smoke', 'spitfire', 'shiftLeft', 'C1299'] }, () => {
    const note = {
      title: `AT_C1299_Note ${getRandomPostfix()}`,
      details: `AT_C1299_NoteDescription ${getRandomPostfix()}`,
    };
    const newNote = {
      title: `AT_C1299_ChangedTitle ${getRandomPostfix()}`,
      details: `AT_C1299_ChangedDetails ${getRandomPostfix()}`,
    };
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: urlsToEholdings[1],
      waiter: NotesEholdings.waitLoading,
    });
    NotesEholdings.createNote(note.title, note.details);
    NotesEholdings.editNote(note.title, newNote.title, newNote.details);
    NotesEholdings.verifyNoteTitle(newNote.title);
    NotesEholdings.openNoteView(newNote.title);
    NotesEholdings.deleteNote();
  });

  it(
    'C16992 View a note (spitfire)',
    { tags: ['smoke', 'spitfire', 'shiftLeft', 'C16992'] },
    () => {
      const note = {
        title: `AT_C16992_Note ${getRandomPostfix()}`,
        details: `AT_C16992_NoteDescription ${getRandomPostfix()}`,
      };
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: urlsToEholdings[2],
        waiter: NotesEholdings.waitLoading,
      });
      NotesEholdings.createNote(note.title, note.details);
      NotesEholdings.verifyNoteTitle(note.title);
      NotesEholdings.openNoteView(note.title);
      NotesEholdings.deleteNote();
    },
  );

  it(
    'C359004 A user can view Notes that were created by deleted user (spitfire)',
    { tags: ['criticalPath', 'spitfire', 'C359004'] },
    () => {
      const note = {
        title: `AT_C359004_Note ${getRandomPostfix()}`,
        details: `AT_C359004_NoteDescription ${getRandomPostfix()}`,
      };
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiNotesItemCreate.gui,
        Permissions.uiNotesItemView.gui,
        Permissions.uiNotesItemEdit.gui,
        Permissions.uiNotesItemDelete.gui,
        Permissions.moduleeHoldingsEnabled.gui,
      ]).then((createdUserProperties) => {
        testData.deletedUserProperties = createdUserProperties;
      });
      cy.then(() => {
        cy.login(testData.deletedUserProperties.username, testData.deletedUserProperties.password, {
          path: urlsToEholdings[3],
          waiter: NotesEholdings.waitLoading,
        });
        NotesEholdings.createNote(note.title, note.details);
        NotesEholdings.verifyNoteTitle(note.title);
        cy.getAdminToken(false);
        Users.deleteViaApi(testData.deletedUserProperties.userId);

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: urlsToEholdings[3],
          waiter: NotesEholdings.waitLoading,
        });
        NotesEholdings.openNoteView(note.title);
        NotesEholdings.deleteNote();
      });
    },
  );
});
