import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import Agreements from '../../../support/fragments/agreements/agreements';
import Notes from '../../../support/fragments/settings/notes/notes';
import TopMenu from '../../../support/fragments/topMenu';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import NewNote from '../../../support/fragments/notes/newNote';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import AgreementsApi from '../../../support/api/agreements';

let agreementId;
let noteTypeId;
const noteType = `NoteType ${randomFourDigitNumber()}`;

describe('Agreements', () => {
  describe('Agreement Notes', () => {
    before('create test data', () => {
      cy.getAdminToken();
      AgreementsApi.createViaApi().then((agreement) => {
        agreementId = agreement.id;
      });
      Notes.createNoteTypeViaApi(noteType).then((note) => {
        noteTypeId = note.id;
      });
      cy.loginAsAdmin({ path: TopMenu.agreementsPath, waiter: Agreements.waitLoading });
    });

    after('delete test data', () => {
      AgreementsApi.deleteViaApi(agreementId);
      Notes.deleteNoteTypeViaApi(noteTypeId);
    });

    it(
      'C1308 Create a note for an Agreement record (erm)',
      { tags: [TestTypes.extendedPath, DevTeams.erm] },
      () => {
        AgreementViewDetails.agreementListClick(AgreementsApi.defaultAgreement.name);
        AgreementViewDetails.openNotesSection();
        AgreementViewDetails.verifyNotesIsEmpty();

        AgreementViewDetails.addNewNote();
        NewNote.verifyNewNoteIsDisplayed();

        NewNote.chooseSelectTypeByTitle(noteType);
        NewNote.fill();
        NewNote.save();
        AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(
          AgreementsApi.defaultAgreement.name,
        );
        AgreementViewDetails.verifyNotesCount('1');

        AgreementViewDetails.openNotesSection();
        AgreementViewDetails.verifySpecialNotesRow(
          NewNote.defaultNote.title,
          NewNote.defaultNote.details,
          noteType,
        );
      },
    );
  });
});
