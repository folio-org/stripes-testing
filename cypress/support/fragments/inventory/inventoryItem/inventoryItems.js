import {
  Button,
  SearchField,
  Pane,
  Checkbox,
  Accordion,
  MultiColumnListCell,
  MultiColumnList,
  TextField
} from '../../../../../interactors';

const searchButton = Button('Search');

export default {
  toggleStatus(statusName) {
    cy.do(Accordion({ id:'itemStatus' }).find(TextField({ type:'search' })).fillIn(statusName));
    // interactor doesn't click
    cy.get('#itemStatus input').click();
    cy.do(Checkbox(statusName).click());
  },

  toggleItemStatusAccordion() {
    cy.do(Accordion({ id:'itemStatus' }).clickHeader());
  },

  selectInstance(title) {
    cy.do(MultiColumnListCell(title).click());
  },

  toggleAccordionItemsButton(holdingId) {
    cy.do(Button({ id: `accordion-toggle-button-${holdingId}` }).click());
  },

  verifyItemWithStatusExists(holdingId, status) {
    cy.expect(MultiColumnList({ id: `list-items-${holdingId}` }).find(MultiColumnListCell(status)).exists());
  },

  searchByParameter: (parameter, value) => {
    cy.do(SearchField({ id: 'input-inventory-search' }).selectIndex(parameter));
    cy.do(SearchField({ id: 'input-inventory-search' }).fillIn(value));
    cy.do(searchButton.focus());
    cy.do(searchButton.click());
  },

  resetAllFilters:() => {
    cy.do(Pane('Search & filter').find(Button('Reset all')).click());
    // without reload test doesn't work
    cy.reload();
    // need some wait for the loading page
    cy.wait(1000);
  },

  checkIsInstanceListPresented:() => {
    cy.expect(MultiColumnList().exists());
  },

  checkIsInstanceListAbsent:() => {
    cy.expect(MultiColumnList().absent());
  }
};
