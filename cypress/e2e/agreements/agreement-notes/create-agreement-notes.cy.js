import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';
import NewNote from '../../../support/fragments/notes/newNote';
import NoteTypes from '../../../support/fragments/settings/notes/noteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

let agreementId;
let noteTypeId;
const noteType = `NoteType ${randomFourDigitNumber()}`;

describe('Agreement Notes', () => {
  before('create test data', () => {
    cy.getAdminToken();
    Agreements.createViaApi().then((agreement) => {
      agreementId = agreement.id;
    });
    NoteTypes.createNoteTypeViaApi({ name: noteType }).then((note) => {
      noteTypeId = note.id;
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
    'C1308 Create a note for an Agreement record (erm) (TaaS)',
    { tags: ['extendedPath', 'erm'] },
    () => {
      AgreementViewDetails.agreementListClick(Agreements.defaultAgreement.name);
      AgreementViewDetails.openNotesSection();
      AgreementViewDetails.verifyNotesIsEmpty();

      AgreementViewDetails.clickOnNewButton();
      NewNote.verifyNewNoteIsDisplayed();

      NewNote.chooseSelectTypeByTitle(noteType);
      NewNote.fill();
      NewNote.save();
      AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(
        Agreements.defaultAgreement.name,
      );
      AgreementViewDetails.verifyNotesCount('1');

      AgreementViewDetails.openNotesSection();
      AgreementViewDetails.verifySpecialNotesRow({
        title: NewNote.defaultNote.title,
        details: NewNote.defaultNote.details,
        type: noteType,
      });
    },
  );
});
