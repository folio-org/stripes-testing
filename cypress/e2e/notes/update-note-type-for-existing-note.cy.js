import { Permissions } from '../../support/dictionary';
import EHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';
import NotesEholdings from '../../support/fragments/notes/notesEholdings';
import Notes from '../../support/fragments/notes/notes';
import NoteTypes from '../../support/fragments/settings/notes/noteTypes';
import Users from '../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import SettingsPane from '../../support/fragments/settings/settingsPane';
import { APPLICATION_NAMES } from '../../support/constants';

describe('Notes', () => {
  const testData = {
    initialNoteType: `C357556 Initial Note type ${randomFourDigitNumber()}`,
    updatedNoteType: `C357556 Updated Note type ${randomFourDigitNumber()}`,
    noteTitle: `C357556 Note ${randomFourDigitNumber()}`,
    noteDetails: 'Testing note type update',
  };
  let user;
  let initialNoteTypeId;
  let providerId;

  before('Create test data', () => {
    cy.getAdminToken();

    EHoldingsProviders.getProvidersViaApi({ count: 1 }).then((providers) => {
      expect(providers.length).to.be.greaterThan(0);
      providerId = providers[0].id;
    });

    NoteTypes.createNoteTypeViaApi({ name: testData.initialNoteType }).then((createdNoteType) => {
      initialNoteTypeId = createdNoteType.id;
    });

    cy.createTempUser([
      Permissions.moduleeHoldingsEnabled.gui,
      Permissions.uiNotesAssignUnassign.gui,
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesSettingsEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Notes.deleteNotesForEHoldingViaApi(providerId);
    NoteTypes.deleteNoteTypeViaApi(initialNoteTypeId, true);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C357556 Verify that user can update "Note type" in Settings that is selected for an existing Note (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire', 'C357556'] },
    () => {
      cy.login(user.username, user.password, {
        path: `/eholdings/providers/${providerId}`,
        waiter: NotesEholdings.waitLoading,
      });

      NotesEholdings.verifyNotesAccordionButtons();

      NotesEholdings.createNoteWithType(
        testData.noteTitle,
        testData.noteDetails,
        testData.initialNoteType,
      );
      cy.wait(2000);
      NotesEholdings.waitLoading();
      NotesEholdings.verifyNoteTitle(testData.noteTitle);

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      SettingsPane.waitLoading();
      SettingsPane.selectSettingsTab(APPLICATION_NAMES.NOTES);
      NoteTypes.clickGeneralButton();

      NoteTypes.clickEditNoteType(testData.initialNoteType);
      NoteTypes.checkNoteButtonsState();
      NoteTypes.fillInNoteType(testData.updatedNoteType);
      NoteTypes.saveNoteType(testData.updatedNoteType);
      NoteTypes.checkNoteTypeIsDisplayed(testData.updatedNoteType);

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EHOLDINGS);
      cy.visit(`/eholdings/providers/${providerId}`);
      NotesEholdings.waitLoading();

      NotesEholdings.verifyNoteTitle(testData.noteTitle);
      NotesEholdings.openNoteView(testData.noteTitle);
      NotesEholdings.waitNoteViewLoading();
      NotesEholdings.verifyNoteViewNoteType(testData.updatedNoteType);
    },
  );
});
