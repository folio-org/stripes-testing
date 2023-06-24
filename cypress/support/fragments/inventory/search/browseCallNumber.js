import {Button, including, MultiColumnListCell, MultiColumnListHeader, Section} from '../../../../../interactors';

const browseButton = Button({ id: 'mode-navigation-browse' });
const instanceDetailsPane = Section({ id: 'pane-instancedetails' });

export default {
  clickOnResult(searchQuery) {
    cy.do(MultiColumnListCell(`${searchQuery}`).find(Button(`${searchQuery}`)).click());
  },

  checkExactSearchResult(searchQuery) {
    cy.do([
      MultiColumnListCell(`${searchQuery}`).has({ innerHTML: including(`<strong>${searchQuery}</strong>`) }),
    ]);
  },

  checkNonExactSearchResult(searchQuery) {
    cy.expect([
      MultiColumnListCell().has({ content: including(`${searchQuery} would be here`) }),
    ]);
  },

  checkItemSearchResult(callNumber, suffix) {
    cy.expect([
      MultiColumnListCell(`${callNumber}would be here`).has({ content: including(`${callNumber}would be here`) }),
      MultiColumnListCell(`${callNumber} ${suffix}`).has({ content: including(`${callNumber} ${suffix}`) }),
    ]);
  },

  checkSearchResultsTable() {
    cy.expect([
      MultiColumnListHeader({ id: 'list-column-callnumber' }).has({ content: 'Call number' }),
      MultiColumnListHeader({ id: 'list-column-title' }).has({ content: 'Title' }),
      MultiColumnListHeader({ id: 'list-column-numberoftitles' }).has({ content: 'Number of titles' }),
    ]);
  },

  checkNotExistingCallNumber(callNumber) {
    cy.expect(MultiColumnListCell(`${callNumber}would be here`).has({ content: including(`${callNumber}would be here`) }));
  },

  checkNotClickableResult(searchQuery) {
    cy.expect(Button(searchQuery).absent());
  },

  selectFoundCallNumber(callNumber) {
    cy.do(Button(including(callNumber)).click());
    cy.expect(instanceDetailsPane.exists());
  },
  
  clickBrowseBtn() {
    cy.do(browseButton.click());
  },
};
