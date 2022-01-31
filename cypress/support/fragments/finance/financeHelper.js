import { Button, MultiColumnListRow, SearchField, Callout } from '../../../../interactors';

const searchField = SearchField({ id: 'input-record-search' });
const noResultsMessageLabel = '//span[contains(@class,"noResultsMessageLabel")]';
const chooseAFilterMessage = 'Choose a filter or enter a search query to show results.';

export default {

  statusActive : 'Active',
  statusFrozen : 'Frozen',
  statusInactive : 'Inactive',

  searchByName : (name) => {
    cy.do([
      searchField.selectIndex('Name'),
      searchField.fillIn(name),
      Button('Search').click(),
    ]);
  },

  searchByCode : (code) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('Code'),
      SearchField({ id: 'input-record-search' }).fillIn(code),
      Button('Search').click(),
    ]);
  },

  searchByExternalAccount : (externalAccount) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('External account number'),
      SearchField({ id: 'input-record-search' }).fillIn(externalAccount),
      Button('Search').click(),
    ]);
  },

  searchByAll : (searchValue) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).fillIn(searchValue),
      Button('Search').click(),
    ]);
  },

  selectFromResultsList: (rowNumber = 0) => {
    cy.do(MultiColumnListRow({ index: rowNumber }).click());
  },

  checkZeroSearchResultsMessage : () => {
    cy.xpath(noResultsMessageLabel)
      .should('be.visible')
      .and('have.text', chooseAFilterMessage);
  },

  clickOnCloseIconButton: () => {
    cy.do(Button({ icon: 'times' }).click());
  },

  checkCalloutMessage: (text, calloutType) => {
    cy.expect(Callout({ type: calloutType }).exists());
    cy.expect(Callout({ type: calloutType }).is({ textContent: text }));
  },

  getRandomBarcode: () => {
    return (Math.floor(100000 + Math.random() * 900000)).toString();
  }
};
