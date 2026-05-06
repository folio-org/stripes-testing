import { Permissions } from '../../support/dictionary';
import NewLicense from '../../support/fragments/licenses/newLicense';
import Licenses from '../../support/fragments/licenses/licenses';
import Notes from '../../support/fragments/notes/notes';
import ExistingNoteView from '../../support/fragments/notes/existingNoteView';
import ExistingNoteEdit from '../../support/fragments/notes/existingNoteEdit';
import NoteTypes from '../../support/fragments/settings/notes/noteTypes';
import Users from '../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import SettingsPane from '../../support/fragments/settings/settingsPane';
import { APPLICATION_NAMES } from '../../support/constants';

describe('Notes', () => {
  const testData = {
    noteType: `C357558 Note type ${randomFourDigitNumber()}`,
    alternateNoteType: `C357558 Alternate Note type ${randomFourDigitNumber()}`,
  };
  let user;
  let noteTypeId;
  let alternateNoteTypeId;
  let licenseId;
  let noteId;
  let defaultNote;

  before('Create test data', () => {
    cy.getAdminToken();

    NoteTypes.createNoteTypeViaApi({ name: testData.noteType })
      .then((createdNoteType) => {
        noteTypeId = createdNoteType.id;
      })
      .then(() => {
        NoteTypes.createNoteTypeViaApi({ name: testData.alternateNoteType });
      })
      .then((createdNoteType) => {
        alternateNoteTypeId = createdNoteType.id;
      })
      .then(() => {
        NewLicense.createViaApi();
      })
      .then((license) => {
        licenseId = license.id;
      })
      .then(() => {
        defaultNote = Notes.defaultNote({ typeId: noteTypeId, agreementId: licenseId }, 'licenses');
        Notes.createViaApi(defaultNote);
      })
      .then((createdNote) => {
        noteId = createdNote.id;
        testData.noteTitle = createdNote.title;
        testData.noteDetails = createdNote.content;
      });

    cy.createTempUser([
      Permissions.licensesSearchAndView.gui,
      Permissions.uiNotesAssignUnassign.gui,
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemEdit.gui,
      Permissions.uiNotesSettingsEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Notes.deleteViaApi(noteId, true);
    cy.deleteLicenseById(licenseId);
    NoteTypes.deleteNoteTypeViaApi(alternateNoteTypeId, true);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C357558 Verify that user can delete the "Note type" if the last "Note" with this "Note type" was updated (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire', 'C357558'] },
    () => {
      cy.login(user.username, user.password, {
        path: `/licenses/${licenseId}`,
        waiter: Licenses.waitLoading,
      });

      NewLicense.expandNotesSection();
      NewLicense.verifyNoteInList(testData.noteTitle);

      NewLicense.clickNoteInList(testData.noteTitle);
      ExistingNoteView.waitLoading();

      ExistingNoteView.gotoEdit();
      ExistingNoteEdit.waitLoading();
      ExistingNoteEdit.changeNoteType(testData.alternateNoteType);
      ExistingNoteEdit.saveNote();

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      SettingsPane.waitLoading();
      SettingsPane.selectSettingsTab(APPLICATION_NAMES.NOTES);
      NoteTypes.clickGeneralButton();

      NoteTypes.checkEditAndDeleteIcons(testData.noteType);
      NoteTypes.deleteNoteType(testData.noteType);

      NoteTypes.checkNoteTypeIsNotDisplayed(testData.noteType);
    },
  );
});
