import { HTML } from '@interactors/html';
import {
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  or,
  including,
} from '../../../../interactors';
import NewAgreement from './newAgreement';
import SearchAndFilterAgreements from './searchAndFilterAgreements';

const section = Section({ id: 'pane-agreement-list' });
const newButton = Button('New');

const waitLoading = () => {
  cy.expect(
    or(
      section.find(MultiColumnListRow()).exists(),
      section.find(HTML(including('No results found. Please check your filters.'))).exists(),
    ),
  );
  cy.expect(newButton.exists());
};

export default {
  waitLoading,

  create: (specialAgreement) => {
    cy.do(newButton.click());
    NewAgreement.waitLoading();
    NewAgreement.fill(specialAgreement);
    NewAgreement.save();
  },

  switchToLocalKBSearch() {
    cy.do(Button('Local KB search').click());
  },

  selectRecord: (agreementTitle) => {
    cy.do(section.find(MultiColumnListCell(agreementTitle)).click());
  },

  agreementNotVisible: (agreementTitle) => cy.expect(section.find(MultiColumnListCell(agreementTitle)).absent()),

  checkAgreementPresented: (name) => {
    SearchAndFilterAgreements.search(name);
    cy.expect(MultiColumnListCell(name).exists());
  },
};
