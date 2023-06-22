import {Button, including, MultiColumnListCell} from '../../../../../interactors';

const browseButton = Button({ id: 'mode-navigation-browse' });

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
  
  clickBrowseBtn() {
    cy.do(browseButton.click());
  },
};
