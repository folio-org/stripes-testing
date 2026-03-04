import { Button, TextInput } from '../../../../interactors';

const MARCAuthorityModal = "//div[@data-testid='modal']";
const searchOption = Button({ dataTestID: 'id-search-segment-button-authorities:search' });
const searchInput = TextInput({ id: 'id-search-textarea' });
const searchButton = Button({ dataTestID: 'id-search-button' });
const assignFoundAuthorityButton = "(//button[text()='Assign'])[1]";

export default {
  waitLoading: () => {
    cy.xpath(MARCAuthorityModal).should('be.visible');
  },

  selectSearchOption: () => {
    cy.do(searchOption.click());
  },
  searchByKeyword: (keyword) => {
    cy.do(searchInput.fillIn(keyword));
    cy.do(searchButton.click());
  },

  assignFoundAuthority: () => {
    cy.xpath(assignFoundAuthorityButton).click();
  },
};
