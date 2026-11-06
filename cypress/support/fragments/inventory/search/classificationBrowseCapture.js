// Passively records classification browse responses so e2e tests can read the backend
// "id" of the browse item that was clicked (browse -> search redirect now uses
// query=(classificationId=="<id>")). Kept in its own module so both InventorySearchAndFilter
// and BrowseClassifications can use it without a circular import.
let lastBrowseItems = [];
let clickedClassificationId = null;
let clickedTitle = null;

export default {
  // req.on('response') (unlike req.continue) doesn't stop other intercepts from handling the request
  register() {
    cy.intercept('GET', '**/browse/classification-numbers/*/instances**', (req) => {
      req.on('response', (res) => {
        lastBrowseItems = res.body?.items || [];
      });
    });
  },

  getItems: () => lastBrowseItems,
  getClickedId: () => clickedClassificationId,
  setClickedId: (id) => {
    clickedClassificationId = id;
  },
  // title shown in the Title column of the clicked browse row (single-title rows only)
  getClickedTitle: () => clickedTitle,
  setClickedTitle: (title) => {
    clickedTitle = title;
  },
};
