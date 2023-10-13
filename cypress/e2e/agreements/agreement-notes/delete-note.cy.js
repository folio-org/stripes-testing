import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import Agreements from '../../../support/fragments/agreements/agreements';
import NoteTypes from '../../../support/fragments/settings/notes/noteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Notes from '../../../support/fragments/notes/notes';
import ExistingNoteView from '../../../support/fragments/notes/existingNoteView';
import DeleteConfirmationModal from '../../../support/fragments/notes/modal/deleteConfirmationModal';
import { TestTypes, DevTeams } from '../../../support/dictionary';

let agreementId;
let noteTypeId;
let defaultNote;
const noteType = `NoteType ${randomFourDigitNumber()}`;
describe('Agreement Notes', () => {
  before(() => {
    cy.getAdminToken();
    Agreements.createViaApi()
      .then((agreement) => {
        agreementId = agreement.id;
      })
      .then(() => NoteTypes.createNoteTypeViaApi(noteType))
      .then((note) => {
        noteTypeId = note.id;
      })
      .then(() => {
        defaultNote = Notes.defaultNote({ typeId: noteTypeId, agreementId });
        Notes.createViaApi(defaultNote);
      });
    cy.loginAsAdmin({
      path: TopMenu.agreementsPath,
      waiter: Agreements.waitLoading,
    });
  });

  after(() => {
    NoteTypes.deleteNoteTypeViaApi(noteTypeId);
    Agreements.deleteViaApi(agreementId);
  });

  it('C1312 Delete a note (erm) (TaaS)', { tags: [TestTypes.extendedPath, DevTeams.erm] }, () => {
    AgreementViewDetails.agreementListClick(Agreements.defaultAgreement.name);
    AgreementViewDetails.openNotesSection();
    AgreementViewDetails.verifySpecialNotesRow({
      title: defaultNote.title,
      details: defaultNote.content,
      type: noteType,
    });

    AgreementViewDetails.clickOnNoteRecordByTitle(defaultNote.title);
    ExistingNoteView.waitLoading();

    ExistingNoteView.gotoDelete();
    DeleteConfirmationModal.waitLoading();
    DeleteConfirmationModal.confirmDeleteNote();

    AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(Agreements.defaultAgreement.name);
  });
});
