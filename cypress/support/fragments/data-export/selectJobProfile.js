import {
  Pane,
  Button,
  MultiColumnList,
  PaneHeader,
  TextFieldIcon,
  MultiColumnListCell,
} from '../../../../interactors';

const searchResults = MultiColumnList({ id: 'search-results-list' });
const jobProfilesPaneHeader = PaneHeader({ id: 'paneHeaderpane-results-subtitle' });
const searchField = '[class^=formControl]';
const searchIcon = TextFieldIcon();
const jobProfilescSearchId = '#input-search-field';
const xIconSelector = '[class^="endControls"]>div>div';
let profilesCount;
const searchButton = Button('Search');

export default {
  verifySelectJobPane() {
    cy.expect(Pane('Select job profile to run the export').exists());
  },

  verifyExistingJobProfiles() {
    searchResults.perform((el) => {
      el.invoke('attr', 'data-total-count').then((num) => {
        jobProfilesPaneHeader.find('span').should('have.text', `${num} job profiles`);
        profilesCount = num;
      });
    });
  },

  verifySearchBox() {
    cy.get(searchField).should('be.visible');
    cy.get(searchField).then((el) => {
      cy.expect(el.find(searchIcon));
    });
  },

  verifySearchButton(isDisabled) {
    cy.expect(searchButton.has({ disabled: isDisabled }));
  },

  searchForAJobProfile(profile) {
    cy.get(jobProfilescSearchId).type(profile);
    cy.get(xIconSelector).should('exist');
    cy.do([searchButton.click()]);
  },

  verifySearchResult(filter, shouldBeEmpty = false) {
    searchResults.perform((el) => {
      el.invoke('attr', 'data-total-count').then((num) => {
        if (shouldBeEmpty === true) {
          expect(num).to.equal(0);
        } else {
          for (let i = 0; i < num; i++) {
            expect(MultiColumnListCell({ row: i, column: 0 }).to.include(filter));
          }
        }
      });
    });
  },

  pressBackspaceXTimes(times) {
    for (let i = 0; i < times; i++) {
      cy.get(jobProfilescSearchId).type('{backspace}');
    }
  },

  clearSearchField() {
    cy.get(jobProfilescSearchId).click();
    cy.get(xIconSelector).click();
  },

  verifyClearedSearchBox() {
    searchResults.perform((el) => {
      el.invoke('attr', 'data-total-count').then((num) => {
        expect(num).to.equal(profilesCount);
      });
    });
    cy.get(jobProfilescSearchId).invoke('val').should('equal', '');
    expect(searchButton.has({ disabled: true }));
  },
};
