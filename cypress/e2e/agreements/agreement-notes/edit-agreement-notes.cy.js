import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';
import ExistingNoteEdit from '../../../support/fragments/notes/existingNoteEdit';
import ExistingNoteView from '../../../support/fragments/notes/existingNoteView';
import Notes from '../../../support/fragments/notes/notes';
import NoteTypes from '../../../support/fragments/settings/notes/noteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

let agreementId;
let noteTypeId;
let defaultNote;
const noteType = `NoteType ${randomFourDigitNumber()}`;
describe('Agreement Notes', () => {
  before('create test data', () => {
    cy.getAdminToken();
    Agreements.createViaApi()
      .then((agreement) => {
        agreementId = agreement.id;
      })
      .then(() => NoteTypes.createNoteTypeViaApi({ name: noteType }))
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

  after('delete test data', () => {
    Agreements.deleteViaApi(agreementId);
    NoteTypes.deleteNoteTypeViaApi(noteTypeId);
  });

  it(
    'C1309 Edit a note on an Agreement record (erm) (TaaS)',
    { tags: ['extendedPath', 'erm'] },
    () => {
      const changedNote = {
        title: `newTilteNote ${randomFourDigitNumber()}`,
        details: `newDetails ${randomFourDigitNumber()}`,
      };
      AgreementViewDetails.agreementListClick(Agreements.defaultAgreement.name);
      AgreementViewDetails.openNotesSection();
      AgreementViewDetails.verifySpecialNotesRow({
        title: defaultNote.title,
        details: defaultNote.content,
        type: noteType,
      });
      AgreementViewDetails.clickOnNoteRecordByTitle(defaultNote.title);

      ExistingNoteView.waitLoading();
      ExistingNoteView.gotoEdit();
      ExistingNoteEdit.waitLoading();

      ExistingNoteEdit.fillNoteFields(changedNote);
      ExistingNoteEdit.saveNote();
      ExistingNoteView.checkProperties(changedNote);

      ExistingNoteView.close();
      AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(
        Agreements.defaultAgreement.name,
      );

      AgreementViewDetails.openNotesSection();
      AgreementViewDetails.verifySpecialNotesRow({
        title: changedNote.title,
        details: changedNote.details,
        type: noteType,
      });
    },
  );
});
