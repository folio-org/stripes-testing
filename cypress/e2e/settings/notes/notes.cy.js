import { Permissions } from '../../../support/dictionary';
import NoteTypes from '../../../support/fragments/settings/notes/noteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Notes', () => {
  let user;
  const noteType = `C1205 Note ${randomFourDigitNumber()}`;
  const editedNoteType = `C1205 edited Note ${randomFourDigitNumber()}`;
  const generalNote = 'General note';
  const getCalloutMessage = (note) => `The note type ${note} was successfully deleted`;
  let isGeneralNoteAssigned;

  before('Creating data', () => {
    cy.createTempUser([Permissions.uiNotesSettingsEdit.gui]).then((userProperties) => {
      user = userProperties;
      NoteTypes.getNoteTypeAssignmentStatus(generalNote).then((isAssigned) => {
        isGeneralNoteAssigned = isAssigned;
      });

      cy.login(user.username, user.password, {
        path: TopMenu.notesPath,
        waiter: NoteTypes.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C1205 Settings (Notes): Edit and View General settings (promin) (TaaS)',
    { tags: ['criticalPath', 'promin', 'C1205'] },
    () => {
      NoteTypes.checkNewNoteButtonEnabled();
      NoteTypes.checkNoteTypeIsDisplayed(generalNote);
      if (isGeneralNoteAssigned) NoteTypes.checkDeleteIconNotDisplayed(generalNote);
      else NoteTypes.checkEditAndDeleteIcons(generalNote);
      NoteTypes.addNoteType();
      NoteTypes.fillInNoteType(noteType);
      NoteTypes.saveNoteType(noteType);
      NoteTypes.clickEditNoteType(noteType);
      NoteTypes.checkNoteButtonsState();
      NoteTypes.fillInNoteType(editedNoteType);
      NoteTypes.saveNoteType(editedNoteType);
      NoteTypes.deleteNoteType(editedNoteType);
      InteractorsTools.checkCalloutMessage(getCalloutMessage(editedNoteType));
      NoteTypes.checkNoteTypeIsNotDisplayed(editedNoteType);
    },
  );
});
