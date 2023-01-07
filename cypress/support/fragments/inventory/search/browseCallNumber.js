import {
  Button,
  including,
  MultiColumnListCell,
} from "../../../../../interactors";

const browseButton = Button({ id: "mode-navigation-browse" });

export default {
  checkExactSearchResult(searchQuery) {
    cy.do([
      MultiColumnListCell(`${searchQuery}`).has({
        innerHTML: including(`<strong>${searchQuery}</strong>`),
      }),
    ]);
  },

  checkNonExactSearchResult(searchQuery) {
    cy.expect([
      MultiColumnListCell().has({
        content: including(`${searchQuery} would be here`),
      }),
    ]);
  },
  clickBrowseBtn() {
    cy.do(browseButton.click());
  },
};
