import { Pane, Button } from '../../../../interactors';

const searchResults = '#search-results-list';
const jobRolesFoundText = '#paneHeaderpane-results-subtitle>span';
const searchField = '[class^=formControl]';
const searchIcon = '[class^=textFieldIcon---Gij5r]';
const searchButton = Button('Search', { disabled: true });

export default {
  verifySelectJobPane() {
    cy.expect(Pane('Select job profile to run the export').exists());
  },

  verifyExistingJobProfiles() {
    cy.get(searchResults)
      .invoke('attr', 'data-total-count')
      .then((num) => {
        cy.get(jobRolesFoundText).should('have.text', `${num} job profiles`);
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
