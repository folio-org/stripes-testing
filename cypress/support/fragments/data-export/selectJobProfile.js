import { Pane, Button, MultiColumnList, PaneHeader, TextFieldIcon } from '../../../../interactors';

const searchResults = MultiColumnList({ id: 'search-results-list' });
const jobProfilesPaneHeader = PaneHeader({ id: 'paneHeaderpane-results-subtitle' });
const searchField = '[class^=formControl]';
const searchIcon = TextFieldIcon();
const searchButton = Button('Search', { disabled: true });

export default {
  verifySelectJobPane() {
    cy.expect(Pane('Select job profile to run the export').exists());
  },

  verifyExistingJobProfiles() {
    searchResults.perform((el) => {
      el.invoke('attr', 'data-total-count').then((num) => {
        jobProfilesPaneHeader.find('span').should('have.text', `${num} job profiles`);
      });
    });
  },

  verifySearchBox() {
    cy.get(searchField).should('be.visible');
    cy.get(searchField).then((el) => {
      cy.expect(el.find(searchIcon));
    });
  },

  verifySearchButton() {
    cy.expect(searchButton.exists());
  },
};
