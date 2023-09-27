import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import Agreements from '../../../support/fragments/agreements/agreements';
import NoteTypes from '../../../support/fragments/settings/notes/noteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Notes from '../../../support/fragments/notes/notes';
import { TestTypes, DevTeams } from '../../../support/dictionary';

let agreementId;
let noteTypeId;
let noteId;
let defaultNote;
const noteType = `NoteType ${randomFourDigitNumber()}`;

describe('Agreement Notes', () => {
  before(() => {
    cy.getAdminToken();
    Agreements.createViaApi().then((agreement) => {
      agreementId = agreement.id;
    });
    NoteTypes.createNoteTypeViaApi(noteType)
      .then((note) => {
        noteTypeId = note.id;
      })
      .then(() => {
        defaultNote = Notes.defaultNote({ typeId: noteTypeId, agreementId });
        Notes.createViaApi(defaultNote).then((note) => {
          noteId = note.id;
        });
      });
    cy.loginAsAdmin({
      path: TopMenu.agreementsPath,
      waiter: Agreements.waitLoading,
    });
  });

  after(() => {
    Notes.deleteViaApi(noteId);
    NoteTypes.deleteNoteTypeViaApi(noteTypeId);
    Agreements.deleteViaApi(agreementId);
  });

  it(
    'C1347 View a note on an Agreement record (erm) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.erm] },
    () => {
      AgreementViewDetails.agreementListClick(Agreements.defaultAgreement.name);
      AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(
        Agreements.defaultAgreement.name,
      );
      AgreementViewDetails.verifyNotesCount('1');

      AgreementViewDetails.openNotesSection();
      AgreementViewDetails.verifySpecialNotesRow({
        title: defaultNote.title,
        details: defaultNote.content,
        type: noteType,
      });
    },
  );
});
