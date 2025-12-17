import Permissions from '../../support/dictionary/permissions';
import NotesEholdings from '../../support/fragments/notes/notesEholdings';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import Notes from '../../support/fragments/notes/notes';
import NoteTypes from '../../support/fragments/settings/notes/noteTypes';
import AssignNote from '../../support/fragments/notes/modal/assign-unassign-notes';
import EHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';

describe('Assign note and check sorting', () => {
  const testData = {};
  const createdNotes = [];
  const noteType = 'General note';

  before('create test data', () => {
    cy.getAdminToken();

    EHoldingsProviders.getProvidersViaApi({ count: 1 }).then((providers) => {
      expect(providers.length).to.be.greaterThan(0);
      testData.providerId = providers[0].id;
    });

    NoteTypes.getNoteTypesViaApi().then((noteTypes) => {
      const foundNoteType = noteTypes.find((type) => type.name === noteType);
      testData.noteTypeId = foundNoteType.id;

      const noteTitles = [
        `AAA First Note ${getRandomPostfix()}`,
        `BBB Second Note ${getRandomPostfix()}`,
        `CCC Third Note ${getRandomPostfix()}`,
      ];

      testData.firstNoteTitle = noteTitles[0];
      testData.secondNoteTitle = noteTitles[1];
      testData.thirdNoteTitle = noteTitles[2];

      noteTitles.forEach((title) => {
        const noteData = {
          domain: 'eholdings',
          typeId: testData.noteTypeId,
          title,
          content: 'Test note details for sorting verification',
          links: [
            {
              type: 'provider',
              id: testData.providerId,
            },
          ],
        };
        Notes.createViaApi(noteData).then((note) => {
          if (note && note.id) {
            createdNotes.push(note);
          }
        });
      });
    });

    cy.createTempUser([
      Permissions.uiNotesAssignUnassign.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemCreate.gui,
      Permissions.moduleeHoldingsEnabled.gui,
    ]).then((userProperties) => {
      testData.userProperties = userProperties;
    });
  });

  after('delete test data', () => {
    cy.getAdminToken().then(() => {
      createdNotes.forEach((note) => {
        Notes.deleteViaApi(note.id);
      });
      Users.deleteViaApi(testData.userProperties.userId);
    });
  });

  it(
    'C1297 Assign a note and check sorting in "Assign / Unassign note" modal (spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire', 'C1297'] },
    () => {
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: `/eholdings/providers/${testData.providerId}`,
        waiter: NotesEholdings.waitLoading,
      });

      NotesEholdings.clickAssignUnassignButton();
      AssignNote.verifyModalIsShown();

      AssignNote.selectNoteType(noteType);

      AssignNote.verifyDesiredNoteIsShown(testData.firstNoteTitle);
      AssignNote.verifyDesiredNoteIsShown(testData.secondNoteTitle);
      AssignNote.verifyDesiredNoteIsShown(testData.thirdNoteTitle);

      AssignNote.verifyNotesSortedByTitle('ascending');

      AssignNote.clickTitleColumnHeader();
      AssignNote.verifyNotesSortedByTitle('descending');

      AssignNote.clickTitleColumnHeader();
      AssignNote.verifyNotesSortedByTitle('ascending');

      AssignNote.clickColumnHeader('Status');
      AssignNote.verifyColumnIsNotSortable('Status');

      AssignNote.clickColumnHeader('# of assignments');
      AssignNote.verifyColumnIsNotSortable('# of assignments');
    },
  );
});
