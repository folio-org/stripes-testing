import { including, MultiColumnListCell } from '../../../../../interactors';

export default {
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
};
