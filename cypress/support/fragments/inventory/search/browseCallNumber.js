import { Select, TextInput, including, Button, MultiColumnListCell, MultiColumnListRow } from '../../../../../interactors';

const inventorySearch = TextInput({ id: 'input-inventory-search' });
const browseButton = Button('Browse');
const row4 = MultiColumnListRow({ index: 4 });
const row5 = MultiColumnListRow({ index: 5 });

export default {
  select() {
    // cypress can't draw selected option without wait
    cy.wait(1000);
    cy.do(Select('Search field index').choose('Browse call numbers'));
  },

  browse(callNumber) {
    cy.do([
      inventorySearch.fillIn(callNumber),
      browseButton.click(),
    ]);
  },
  checkExactSearchResult(searchQuery, instanceTitle) {
    cy.do([
      MultiColumnListCell(`${searchQuery}${instanceTitle}`).has({ innerHTML: `<strong>${searchQuery}</strong>` }),
      row4.has({ content: including(searchQuery) }),
    ]);
  },

  checkNonExactSearchResult(searchQuery) {
    cy.expect([
      row4.has({ content: `${searchQuery}would be here` }),
      row5.has({ content: including(searchQuery) }),
    ]);
  },

};
