import { Permissions } from '../../../support/dictionary';
import NoteTypes from '../../../support/fragments/settings/notes/noteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Notes - Note Types Limit', () => {
  const testData = {
    user: {},
    noteTypeIds: [],
    allExistingNotes: [],
    maxLimit: 25,
  };
  const noteTypePrefix = `C721673_NoteType_${randomFourDigitNumber()}`;
  const editedSuffix = '_EDITED';
  const attemptedNoteTypeName = `${noteTypePrefix}_26`;
  const generalNote = 'General note';
  before('Create test data', () => {
    cy.getAdminToken();

    NoteTypes.getNoteTypesViaApi().then((noteTypes) => {
      const existingCount = noteTypes.length;
      const toCreate = testData.maxLimit - existingCount;
      testData.allExistingNotes.push(
        ...noteTypes
          .filter((noteType) => noteType.name !== generalNote)
          .map((noteType) => noteType.name),
      );

      for (let i = 0; i < toCreate; i++) {
        NoteTypes.createNoteTypeViaApi({
          name: `${noteTypePrefix}_${existingCount + i + 1}`,
        }).then((noteType) => {
          testData.noteTypeIds.push(noteType.id);
          testData.allExistingNotes.push(noteType.name);
        });
      }
    });

    cy.createTempUser([Permissions.uiNotesSettingsEdit.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.notesPath,
        waiter: NoteTypes.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    testData.noteTypeIds.forEach((noteTypeId) => {
      NoteTypes.deleteNoteTypeViaApi(noteTypeId);
    });

    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C721673 Verify limit for "Note types" (spitfire)',
    { tags: ['criticalPath', 'spitfire', 'C721673'] },
    () => {
      const updatedNoteTypeName = `${testData.allExistingNotes[0]}${editedSuffix}`;

      NoteTypes.checkNewNoteButtonEnabled();
      NoteTypes.addNoteType();
      NoteTypes.fillInNoteType(attemptedNoteTypeName);
      NoteTypes.clickSaveAndVerifyMaxLimitErrorToast();
      NoteTypes.clickCancelNoteTypeCreation(attemptedNoteTypeName);

      NoteTypes.createNoteTypeExpectingError(attemptedNoteTypeName);

      NoteTypes.clickEditNoteTypeExact(testData.allExistingNotes[0]);
      NoteTypes.fillInNoteType(updatedNoteTypeName);
      NoteTypes.saveNoteType(updatedNoteTypeName);
      NoteTypes.checkNoteTypeIsDisplayed(updatedNoteTypeName);

      NoteTypes.clickEditNoteType(updatedNoteTypeName);
      NoteTypes.fillInNoteType(testData.allExistingNotes[0]);
      NoteTypes.saveNoteType(testData.allExistingNotes[0]);
      NoteTypes.checkNoteTypeIsDisplayed(testData.allExistingNotes[0]);
    },
  );
});
