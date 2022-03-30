import { Button, MultiColumnListCell, MultiSelect, Pane, IconButton, TextArea, ValueChipRoot, Checkbox, TextField, Badge, MultiColumnListHeader } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';

export default {
  removeCreatedRequest() {
    cy.do([
      Pane({ title: 'Request Detail' }).find(Button('Actions')).click(),
      Button({ id: 'clickable-cancel-request' }).click(),
      TextArea('Additional information for patron *').fillIn('test'),
      Button('Confirm').click(),
    ]);
  },

  findCreatedRequest(title) {
    cy.do(TextField({ id: 'input-request-search' }).fillIn(title));
    cy.do(Pane({ title: 'Search & filter' }).find(Button('Search')).click());
  },

  selectAwaitingDeliveryRequest() {
    cy.do(Checkbox({ name: 'Open - Awaiting delivery' }).click());
  },

  selectAwaitingPickupRequest() {
    cy.do(Checkbox({ name: 'Open - Awaiting pickup' }).click());
  },

  selectInTransitRequest() {
    cy.do(Checkbox({ name: 'Open - In transit' }).click());
  },

  selectNotYetFilledRequest() {
    cy.do(Checkbox({ name: 'Open - Not yet filled' }).click());
  },

  selectAllOpenRequests() {
    this.selectAwaitingDeliveryRequest();
    this.selectAwaitingPickupRequest();
    this.selectInTransitRequest();
    this.selectNotYetFilledRequest();
  },

  selectFirstRequest(title) {
    cy.do(Pane({ title: 'Requests' }).find(MultiColumnListCell({ row: 0, column: title })).click());
  },

  openTagsPane() {
    cy.do(Button({ id: 'clickable-show-tags' }).click());
  },

  selectTags(tag) {
    this.waitLoadingTags();
    cy.do(Pane({ title: 'Tags' }).find(MultiSelect()).select(tag));
  },

  closePane(title) {
    cy.do(Pane({ title }).find(IconButton({ ariaLabel: 'Close ' })).click());
  },

  verifyAssignedTags(tag) {
    cy.expect(Button({ id: 'clickable-show-tags' }).find(Badge()).has({ value: '1' }));
    cy.expect(Pane({ title: 'Tags' }).find(ValueChipRoot(tag)).exists());
  },

  waitLoadingTags() {
    cy.expect(Pane({ title: 'Tags' }).exists());
    cy.intercept({
      method: 'GET',
      url: '/tags?limit=10000',
    }).as('getTags');
    cy.wait('@getTags');
  },

  sortingColumns: [
    {
      title: 'Title',
      id: 'title',
      columnIndex: 2,
    },
    {
      title: 'Item barcode',
      id: 'itembarcode',
      columnIndex: 4,
    },
    {
      title: 'Requester',
      id: 'requester',
      columnIndex: 8,
    },
    {
      title: 'Requester Barcode',
      id: 'requesterbarcode',
      columnIndex: 9,
    },
    {
      title: 'Type',
      id: 'type',
      columnIndex: 5,
    }
  ],

  checkAllRequestTypes() {
    cy.get('#clickable-filter-requestType-hold').check();
    cy.get('#clickable-filter-requestType-page').check();
    cy.get('#clickable-filter-requestType-recall').check();
    // cy.do([
    //   Checkbox({ name: 'Recall' }).click(),
    //   Checkbox({ name: 'Page' }).click(),
    //   Checkbox({ name: 'Hold' }).click()
    // ]);
  },

  validateRequestTypes() {
    cy.expect(Checkbox({ name: 'Recall' }).checked);
    cy.expect(Checkbox({ name: 'Page' }).checked);
    cy.expect(Checkbox({ name: 'Hold' }).checked);
  },

  validateNumsAscendingOrder(prev) {
    const itemsClone = [...prev];
    itemsClone.sort((a, b) => a - b);
    cy.expect(itemsClone).to.deep.equal(prev);
  },

  validateNumsDescendingOrder(prev) {
    const itemsClone = [...prev];
    itemsClone.sort((a, b) => b - a);
    cy.expect(itemsClone).to.deep.equal(prev);
  },

  validateStringsAscendingOrder(prev) {
    const itemsClone = [...prev];

    itemsClone.sort((a, b) => {
      // when sorting move falsy values to the end and localeCompare truthy values
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    });

    expect(prev).to.deep.equal(itemsClone);
  },

  validateStringsDescendingOrder(prev) {
    const itemsClone = [...prev];
    // when sorting move falsy values to the beginning and localeCompare truthy values
    itemsClone.sort((a, b) => {
      if (!a) return -1;
      if (!b) return 1;
      return b.localeCompare(a);
    });
    expect(prev).to.deep.equal(itemsClone);
  },

  // TODO: redesign to interactors
  getMultiColumnListCellsValues(cell) {
    const cells = [];
    // get MultiColumnList rows and loop over
    return cy.get('[data-row-index]').each($row => {
      // from each row, choose specific cell
      cy.get(`[class*="mclCell-"]:nth-child(${cell})`, { withinSubject: $row })
      // extract its text content
        .invoke('text')
        .then(cellValue => {
          cells.push(cellValue);
        });
    })
      .then(() => cells);
  },

  getSortOrder(headerTitle) {
    let order;
    return cy.do(MultiColumnListHeader({ id: 'list-column-' + headerTitle }).perform(el => {
      order = el.attributes.getNamedItem('aria-sort').value;
    })).then(() => order);
  },

  validateRequestsDateSortingOrder() {
    this.getSortOrder('requestdate').then(order => {
      this.getMultiColumnListCellsValues(1).then(cells => {
        const dates = cells.map(cell => new Date(cell));
        if (order === 'ascending') this.validateNumsAscendingOrder(dates);
        else if (order === 'descending') this.validateNumsDescendingOrder(dates);
      });
    });
  },

  validateRequestsSortingOrder({ headerTitle, columnIndex }) {
    this.waitLoadingRequests();

    this.getSortOrder(headerTitle).then(order => {
      this.getMultiColumnListCellsValues(columnIndex).then(cells => {
        if (order === 'ascending') this.validateStringsAscendingOrder(cells);
        else if (order === 'descending') this.validateStringsDescendingOrder(cells);
      });
    });
  },

  waitLoadingRequests() {
    cy.wait('@getRequests');
    /*
      ***
      - REASON: cy.wait(300)
      It awaits for the api to resolve but as previous MultiColumnCellValues are already present
      It does not wait for UI to update cellValues and some test fails randomly.
      with cy.wait(300) It awaits UI for ui to update and tests work.
      ***
    */

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(300);
  }
};
