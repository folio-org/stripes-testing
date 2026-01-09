import { Permissions } from '../../support/dictionary';
import EHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';
import EHoldingsProviderView from '../../support/fragments/eholdings/eHoldingsProviderView';
import Notes from '../../support/fragments/notes/notes';
import NotesEholdings from '../../support/fragments/notes/notesEholdings';
import NoteTypes from '../../support/fragments/settings/notes/noteTypes';
import Users from '../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import SettingsPane from '../../support/fragments/settings/settingsPane';
import { APPLICATION_NAMES } from '../../support/constants';

describe('Notes', () => {
  const testData = {
    noteType: `C357557 Note type ${randomFourDigitNumber()}`,
  };
  let user;
  let noteTypeId;
  let noteId;
  let providerId;
  let defaultNote;

  before('Create test data', () => {
    cy.getAdminToken();

    EHoldingsProviders.getProvidersViaApi({ count: 1 }).then((providers) => {
      expect(providers.length).to.be.greaterThan(0);
      providerId = providers[0].id;
    });

    NoteTypes.createNoteTypeViaApi({ name: testData.noteType })
      .then((createdNoteType) => {
        noteTypeId = createdNoteType.id;
      })
      .then(() => {
        defaultNote = Notes.defaultNote(
          { typeId: noteTypeId, agreementId: providerId },
          'eholdings',
        );
        Notes.createViaApi(defaultNote).then((createdNote) => {
          noteId = createdNote.id;
          testData.noteTitle = createdNote.title;
          testData.noteContent = createdNote.content;
        });
      });

    cy.createTempUser([
      Permissions.moduleeHoldingsEnabled.gui,
      Permissions.uiNotesAssignUnassign.gui,
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemDelete.gui,
      Permissions.uiNotesSettingsEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Notes.deleteViaApi(noteId, true);
    NoteTypes.deleteNoteTypeViaApi(noteTypeId, true);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C357557 Verify that user can delete the "Note type" if the last "Note" with this "Note type" was deleted (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire', 'C357557'] },
    () => {
      cy.login(user.username, user.password, {
        path: `/eholdings/providers/${providerId}`,
        waiter: NotesEholdings.waitLoading,
      });

      NotesEholdings.verifyNoteTitle(testData.noteTitle);
      NotesEholdings.openNoteView(testData.noteTitle);
      cy.wait(1000);

      NotesEholdings.deleteNote();
      EHoldingsProviderView.waitLoading();
      NotesEholdings.verifyNoteDeletion(testData.noteTitle, testData.noteContent);

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      SettingsPane.waitLoading();
      SettingsPane.selectSettingsTab(APPLICATION_NAMES.NOTES);
      NoteTypes.clickGeneralButton();

      NoteTypes.checkEditAndDeleteIcons(testData.noteType);
      NoteTypes.verifyNoteTypeIsNotAssigned(noteTypeId);
      NoteTypes.deleteNoteType(testData.noteType);

      NoteTypes.checkNoteTypeIsNotDisplayed(testData.noteType);
    },
  );
});
