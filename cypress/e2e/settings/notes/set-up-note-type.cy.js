import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import NoteTypes from '../../../support/fragments/settings/notes/noteTypes';
import Users from '../../../support/fragments/users/users';
import AgreementsDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import NewNote from '../../../support/fragments/notes/newNote';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Notes', () => {
  let user;
  const noteType = `Note-type-${randomFourDigitNumber()}`;
  const getCalloutMessage = (note) => `The note type ${note} was successfully deleted`;
  let agreementId;

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.uiUsersView.gui,
      Permissions.uiAgreementsSearchAndView.gui,
      Permissions.moduleeHoldingsEnabled.gui,
      Permissions.uiRequestsView.gui,
      Permissions.uiNotesAssignUnassign.gui,
      Permissions.uiNotesItemCreate.gui,
      Permissions.uiNotesItemView.gui,
      Permissions.uiNotesItemEdit.gui,
      Permissions.uiNotesSettingsEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });
    cy.getAdminToken();
    Agreements.createViaApi().then((agreement) => {
      agreementId = agreement.id;
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Agreements.deleteViaApi(agreementId);
  });

  it(
    'C16985 Settings | Set up a note type (spitfire)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      cy.login(user.username, user.password, {
        path: TopMenu.notesPath,
        waiter: NoteTypes.waitLoading,
      });
      NoteTypes.checkNewNoteButtonEnabled();
      NoteTypes.addNoteType();
      NoteTypes.fillInNoteType(noteType);
      NoteTypes.saveNoteType(noteType);
      cy.visit(TopMenu.agreementsPath);
      AgreementViewDetails.agreementListClick(Agreements.defaultAgreement.name);
      AgreementViewDetails.openNotesSection();
      AgreementViewDetails.verifyNotesIsEmpty();
      AgreementsDetails.clickOnNewButton();
      NewNote.verifyNewNoteIsDisplayed();
      NewNote.verifyNoteTypeExists(noteType);
      cy.visit(TopMenu.notesPath);
      NoteTypes.deleteNoteType(noteType);
      InteractorsTools.checkCalloutMessage(getCalloutMessage(noteType));
      NoteTypes.checkNoteTypeIsNotDisplayed(noteType);
    },
  );
});
