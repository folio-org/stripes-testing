import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';
import AssignNote from '../../../support/fragments/notes/modal/assign-unassign-notes';
import Notes from '../../../support/fragments/notes/notes';
import NoteTypes from '../../../support/fragments/settings/notes/noteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

let agreementId;
let noteTypeId;
let defaultUnassignedNote;
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
        defaultUnassignedNote = Notes.defaultUnassignedNote({ typeId: noteTypeId });
        Notes.createViaApi(defaultUnassignedNote);
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
    'C1310 Assign a note to an Agreement record (erm) (TaaS)',
    { tags: ['extendedPath', 'erm'] },
    () => {
      AgreementViewDetails.agreementListClick(Agreements.defaultAgreement.name);
      AgreementViewDetails.openNotesSection();
      AgreementViewDetails.verifyNotesIsEmpty();

      AgreementViewDetails.clickOnAssignUnassignButton();
      AssignNote.verifyModalIsShown();

      AssignNote.searchForNote(defaultUnassignedNote.title);
      AssignNote.verifyDesiredNoteIsShown(defaultUnassignedNote.title);

      AssignNote.clickCheckboxForNote(defaultUnassignedNote.title);
      AssignNote.clickSaveButton();
      AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(
        Agreements.defaultAgreement.name,
      );
      AgreementViewDetails.verifySpecialNotesRow({
        title: defaultUnassignedNote.title,
        details: defaultUnassignedNote.content,
        type: noteType,
      });
    },
  );
});
