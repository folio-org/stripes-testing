import { Button, MultiColumnListCell, MultiColumnListRow, Section, or, including, HTML } from '../../../../interactors';
import NewAgreement from './newAgreement';
import AgreementDetails from './agreementsDetails';

const section = Section({ id: 'pane-agreement-list' });
const newButton = Button('New');
const waitLoading = () => {
  cy.expect(or(
    section.find(MultiColumnListRow()).exists(),
    section.find(HTML(including('No results found. Please check your filters.'))).exists()
  ));
  cy.expect(newButton.exists());
};

export default {
  waitLoading,

  create: (specialAgreement = NewAgreement.defaultAgreement) => {
    cy.do(newButton.click());
    NewAgreement.waitLoading();
    NewAgreement.fill(specialAgreement);
    NewAgreement.save();
    waitLoading();

    cy.do(section.find(MultiColumnListCell(specialAgreement.name)).click());
  },

  selectRecord: (agreementTitle = NewAgreement.defaultAgreement.name) => {
    cy.do(section.find(MultiColumnListCell(agreementTitle)).click());
    AgreementDetails.waitLoading();
  },

  agreementNotVisible: (agreementTitle) => cy.expect(section.find(MultiColumnListCell(agreementTitle)).absent())
};

