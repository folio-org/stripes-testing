import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import Agreements from '../../../support/fragments/agreements/agreements';
import Notes from '../../../support/fragments/settings/notes/notes';
import TopMenu from '../../../support/fragments/topMenu';
import AgreementsDetails from '../../../support/fragments/agreements/agreementsDetails';
import NewNote from '../../../support/fragments/notes/newNote';

let agreementId;
let noteTypeId;
const noteType = `NoteType ${randomFourDigitNumber()}`;
describe('Agreement Notes', () => {
  before(() => {
    cy.getAdminToken();
    Agreements.createViaApi()
      .then((agreement) => {
        agreementId = agreement.id;
      });
    Notes.createNoteTypeViaApi(noteType)
      .then((note) => {
        noteTypeId = note.id;
      });
    cy.loginAsAdmin();
    cy.visit(TopMenu.agreementsPath);
    Agreements.waitLoading();
  });

  after(() => {
    Agreements.deleteViaApi(agreementId);
    Notes.deleteNoteTypeViaApi(noteTypeId);
  });

  it('C1308 Create a note for an Agreement record (erm)', () => {
    AgreementsDetails.agreementListClick(Agreements.defaultAgreement.name);
    AgreementsDetails.openNotesSection();
    AgreementsDetails.verifyNotesIsEmpty();

    AgreementsDetails.clickOnNewButton();
    NewNote.verifyNewNoteIsDisplayed();

    NewNote.chooseSelectTypeByTitle(noteType);
    NewNote.fill();
    NewNote.save();
    AgreementsDetails.verifyAgreementDetailsIsDisplayedByTitle(Agreements.defaultAgreement.name);
    AgreementsDetails.verifyNotesCount('1');

    AgreementsDetails.openNotesSection();
    AgreementsDetails.verifySpecialNotesRow(NewNote.defaultNote.title, NewNote.defaultNote.details, noteType);
  });
});
