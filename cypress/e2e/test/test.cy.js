import getRandomPostfix from '../../support/utils/stringTools';
import DateTools from '../../support/utils/dateTools';
import Agreements from '../../support/fragments/agreements/agreements';
import Notes from '../../support/fragments/settings/notes/notes';
import TopMenu from '../../support/fragments/topMenu';
import AgreementsDetails from '../../support/fragments/agreements/agreementsDetails';
import NewNote from '../../support/fragments/notes/newNote';

const agreementBody = {
  periods: [
    {
      startDate: DateTools.getCurrentDateForFiscalYear(),
    }
  ],
  name: 'AutotestAgreement' + getRandomPostfix(),
  agreementStatus: 'active'
};
let agreementId;
let noteTypeId;
const noteType = 'NoteType' + getRandomPostfix();
describe('Agreement Notes', () => {
  before(() => {
    cy.getAdminToken();
    Agreements.createViaApi(agreementBody)
      .then((agreement) => {
        agreementId = agreement;
      });
    Notes.createNoteTypeViaApi(noteType)
      .then((note) => {
        noteTypeId = note;
      });
    cy.loginAsAdmin();
    cy.visit(TopMenu.agreementsPath);
    Agreements.waitLoading();
  });

  after(() => {
    Agreements.deleteViaApi(agreementId);
    Notes.deleteNoteTypeViaApi(noteTypeId);
  });

  it('C1308 Create a note for an Agreement record', () => {
    AgreementsDetails.agreementListClick(agreementBody.name);
    AgreementsDetails.openNotesSection();
    AgreementsDetails.verifyNotesIsEmpty();

    AgreementsDetails.clickOnNewButton();
    NewNote.verifyNewNoteIsDisplayed();

    NewNote.chooseSelectTypeByTitle(noteType);
    NewNote.fill();
    NewNote.save();
    NewNote.verifyNewNoteIsNotDisplayed();
    AgreementsDetails.verifyAgreementDetailsIsDisplayedByTitle(agreementBody.name);
    AgreementsDetails.verifyNotesCount('1');

    AgreementsDetails.openNotesSection();
    AgreementsDetails.verifySpecialNotesRow(NewNote.defaultNote.title, NewNote.defaultNote.details, noteType);
  });
});
