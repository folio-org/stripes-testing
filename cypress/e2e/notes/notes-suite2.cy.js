import Permissions from '../../support/dictionary/permissions';
import NotesEholdings from '../../support/fragments/notes/notesEholdings';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Note creation', () => {
  const testData = {};
  const urlsToEholdings = [
    '/eholdings/providers/28830',
    '/eholdings/providers/394',
    '/eholdings/providers/392',
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
    Users.deleteViaApi(testData.deletedUserProperties2?.userId);
  });

  it(
    'C359005 A user can view Notes that were edited by deleted user (spitfire)',
    { tags: ['criticalPath', 'spitfire', 'C359005'] },
    () => {
      const note = {
        title: `AT_C359005_Note ${getRandomPostfix()}`,
        details: `AT_C359005_NoteDescription ${getRandomPostfix()}`,
      };
      const editedNote = {
        title: `AT_C359005_EditedNote ${getRandomPostfix()}`,
        details: `AT_C359005_EditedNoteDescription ${getRandomPostfix()}`,
      };
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiNotesItemCreate.gui,
        Permissions.uiNotesItemView.gui,
        Permissions.uiNotesItemEdit.gui,
        Permissions.uiNotesItemDelete.gui,
        Permissions.moduleeHoldingsEnabled.gui,
      ]).then((createdUserProperties) => {
        testData.deletedUserProperties2 = createdUserProperties;
      });

      cy.then(() => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: urlsToEholdings[0],
          waiter: NotesEholdings.waitLoading,
        });
        NotesEholdings.createNote(note.title, note.details);
        NotesEholdings.verifyNoteTitle(note.title);

        cy.login(
          testData.deletedUserProperties2.username,
          testData.deletedUserProperties2.password,
          {
            path: urlsToEholdings[0],
            waiter: NotesEholdings.waitLoading,
          },
        );
        NotesEholdings.editNote(note.title, editedNote.title, editedNote.details);
        NotesEholdings.verifyNoteTitle(editedNote.title);
        cy.getAdminToken(false);
        Users.deleteViaApi(testData.deletedUserProperties2.userId);

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: urlsToEholdings[0],
          waiter: NotesEholdings.waitLoading,
        });
        NotesEholdings.openNoteView(editedNote.title);
        NotesEholdings.deleteNote();
      });
    },
  );

  it('C1300 Delete a note (spitfire)', { tags: ['criticalPath', 'spitfire', 'C1300'] }, () => {
    const note = {
      title: `AT_C1300_Note ${getRandomPostfix()}`,
      addDetails: `AT_C1300_NoteDescription ${getRandomPostfix()}`,
    };

    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: urlsToEholdings[2],
      waiter: NotesEholdings.waitLoading,
    });
    NotesEholdings.createNote(note.title, note.addDetails);
    NotesEholdings.verifyNoteCreation(note.title, note.addDetails);
    NotesEholdings.openNoteView(note.title, note.addDetails);
    NotesEholdings.deleteNote();
    NotesEholdings.verifyNoteDeletion(note.title, note.addDetails);
  });

  it(
    'C16993 Able to sort Notes accordion column headings (spitfire)',
    { tags: ['criticalPath', 'spitfire', 'C16993'] },
    () => {
      const note = {
        titleFirst: `AT_C16993_Note1_Title ${getRandomPostfix()}`,
        titleSecond: `AT_C16993_Note2_Title ${getRandomPostfix()}`,
        addDetails: `AT_C16993_NoteDetails ${getRandomPostfix()}`,
      };

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: urlsToEholdings[1],
        waiter: NotesEholdings.waitLoading,
      });
      NotesEholdings.createNote(note.titleFirst, note.addDetails);
      NotesEholdings.verifyNoteCreation(note.titleFirst, note.addDetails);
      NotesEholdings.createNote(note.titleSecond, note.addDetails);
      NotesEholdings.verifyNoteCreation(note.titleSecond, note.addDetails);

      NotesEholdings.verifyDefaultSort(note.titleFirst, note.titleSecond, note.addDetails);
      NotesEholdings.verifySortingByTitle(note.titleFirst, note.titleSecond, note.addDetails);

      NotesEholdings.openNoteView(note.titleFirst, note.addDetails);
      NotesEholdings.deleteNote();
      NotesEholdings.openNoteView(note.titleSecond, note.addDetails);
      NotesEholdings.deleteNote();
    },
  );
});
