import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import Agreements from '../../../support/fragments/agreements/agreements';
import TopMenu from '../../../support/fragments/topMenu';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Notes from '../../../support/fragments/notes/notes';
import AssignNote from '../../../support/fragments/notes/modal/assign-unassign-notes';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import DateTools from '../../../support/utils/dateTools';
import NoteTypes from '../../../support/fragments/settings/notes/noteTypes';

let firstAgreementId;
let secondAgreementId;
let noteTypeId;
let noteId;
let defaultTwoAssignedNote;
const noteType = `NoteType ${randomFourDigitNumber()}`;
const customAgreement = {
  periods: [
    {
      startDate: DateTools.getCurrentDateForFiscalYear(),
    },
  ],
  name: `AutotestAgreement' ${randomFourDigitNumber()}`,
  agreementStatus: 'active',
};

describe('Agreement Notes', () => {
  before(() => {
    cy.getAdminToken();
    Agreements.createViaApi().then((agreement) => {
      firstAgreementId = agreement.id;
    });
    Agreements.createViaApi(customAgreement).then((agreement) => {
      secondAgreementId = agreement.id;
    });
    NoteTypes.createNoteTypeViaApi(noteType)
      .then((note) => {
        noteTypeId = note.id;
      })
      .then(() => {
        defaultTwoAssignedNote = Notes.defaultTwoAssignedNote({
          typeId: noteTypeId,
          firstAgreementId,
          secondAgreementId,
        });
        Notes.createViaApi(defaultTwoAssignedNote).then((note) => {
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
    Agreements.deleteViaApi(firstAgreementId);
    Agreements.deleteViaApi(secondAgreementId);
  });

  it(
    'C1311 Unassign a note from an Agreement record (erm) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.erm] },
    () => {
      AgreementViewDetails.agreementListClick(Agreements.defaultAgreement.name);
      AgreementViewDetails.openNotesSection();
      AgreementViewDetails.verifySpecialNotesRow({
        title: defaultTwoAssignedNote.title,
        details: defaultTwoAssignedNote.content,
        type: noteType,
      });

      AgreementViewDetails.clickOnAssignUnassignButton();
      AssignNote.verifyModalIsShown();

      AssignNote.selectAssignedNoteStatusCheckbox();
      AssignNote.verifyDesiredNoteIsShown(defaultTwoAssignedNote.title);

      AssignNote.clickCheckboxForNote(defaultTwoAssignedNote.title);
      AssignNote.verifyNoteCheckbox(defaultTwoAssignedNote.title, false);

      AssignNote.clickSaveButton();
      AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(
        Agreements.defaultAgreement.name,
      );
      AgreementViewDetails.verifyNotesIsEmpty();
    },
  );
});
