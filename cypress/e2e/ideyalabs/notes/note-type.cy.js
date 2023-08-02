import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import AgreementsDetails from '../../../support/fragments/agreements/agreementsDetails';
import ExistingNoteEdit from '../../../support/fragments/notes/existingNoteEdit';
import ExistingNoteView from '../../../support/fragments/notes/existingNoteView';
import NewNote from '../../../support/fragments/notes/newNote';
import TopMenu from '../../../support/fragments/topMenu';
import { getFourDigitRandomNumber } from '../../../support/utils/stringTools';

const noteData = `New Note${getFourDigitRandomNumber()}`;
const noteType = `Item${getFourDigitRandomNumber()}`;

describe('Settings', () => {
  before('Login to Folio', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it(
    'C16985 Settings | Set up a note type (spitfire)',
    { tags: [TestTypes.ideaLabsTests, DevTeams.ideaLabsTests] },
    () => {
      cy.visit(TopMenu.notesPath);
      NewNote.fillNote(noteData);
      cy.visit(TopMenu.agreementsPath);
      AgreementsDetails.agreementListClick('2020 ACS Publications');
      AgreementsDetails.openNotesSection();
      AgreementsDetails.clickOnNewButton();
      NewNote.clickOnNoteType(noteData);
      NewNote.deleteNote(noteData);
    }
  );

  it(
    'C1304 Settings | Edit a note type (spitfire)',
    { tags: [TestTypes.ideaLabsTests, DevTeams.ideaLabsTests] },
    () => {
      cy.visit(TopMenu.notesPath);
      ExistingNoteEdit.clickEditButton(noteType);
      cy.visit(TopMenu.agreementsPath);
      AgreementsDetails.agreementListClick('2020 ACS Publications');
      AgreementsDetails.openNotesSection();
      AgreementsDetails.clickOnNewButton();
      NewNote.clickOnNoteType(noteType);
      AgreementsDetails.clickCancelButton();
      NewNote.closeWithoutSaveButton();
      AgreementsDetails.openNotesSection();
      AgreementsDetails.clickOnNoteRecord();
      ExistingNoteView.gotoEdit();
      NewNote.clickOnNoteType(noteType);
    }
  );
});
