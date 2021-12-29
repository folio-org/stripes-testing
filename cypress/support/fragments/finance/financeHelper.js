import { Button, SearchField } from '../../../../interactors';

const searchField = SearchField({ id: 'input-record-search' });
const noResultsMessageLabel = '//span[contains(@class,"noResultsMessageLabel")]';
const chooseAFilterMessage = 'Choose a filter or enter a search query to show results.';

export default {
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

  checkZeroSearchResultsMessageLabel : () => {
    cy.xpath(noResultsMessageLabel)
      .should('be.visible')
      .and('have.text', chooseAFilterMessage);
  }
};
