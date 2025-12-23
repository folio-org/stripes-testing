import { Permissions } from '../../../support/dictionary';
import NoteTypes from '../../../support/fragments/settings/notes/noteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Notes - Note Types Limit', () => {
  const testData = {
    user: {},
    noteTypeIds: [],
    maxLimit: 25,
  };
  const noteTypePrefix = `C721673_NoteType_${randomFourDigitNumber()}`;
  const editedSuffix = '_EDITED';
  const attemptedNoteTypeName = `${noteTypePrefix}_26`;
  const generalNote = 'General note';
  const updatedNoteTypeName = `${generalNote}${editedSuffix}`;
  before('Create test data', () => {
    cy.getAdminToken();

    NoteTypes.getNoteTypesViaApi().then((noteTypes) => {
      const existingCount = noteTypes.length;
      const toCreate = testData.maxLimit - existingCount;

      for (let i = 0; i < toCreate; i++) {
        NoteTypes.createNoteTypeViaApi({
          name: `${noteTypePrefix}_${existingCount + i + 1}`,
        }).then((noteType) => {
          testData.noteTypeIds.push(noteType.id);
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
      NoteTypes.checkNewNoteButtonEnabled();
      NoteTypes.addNoteType();
      NoteTypes.fillInNoteType(attemptedNoteTypeName);
      NoteTypes.clickSaveAndVerifyMaxLimitErrorToast();

      NoteTypes.createNoteTypeExpectingError(attemptedNoteTypeName);

      cy.visit(TopMenu.notesPath);
      NoteTypes.waitLoading();
      NoteTypes.clickEditNoteType(generalNote);
      NoteTypes.fillInNoteType(updatedNoteTypeName);
      NoteTypes.saveNoteType(updatedNoteTypeName);
      NoteTypes.checkNoteTypeIsDisplayed(updatedNoteTypeName);

      NoteTypes.clickEditNoteType(updatedNoteTypeName);
      NoteTypes.fillInNoteType(generalNote);
      NoteTypes.saveNoteType(generalNote);
      NoteTypes.checkNoteTypeIsDisplayed(generalNote);
    },
  );
});
