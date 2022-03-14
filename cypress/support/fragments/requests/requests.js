import { Button, MultiColumnListCell, MultiSelect, Pane, IconButton, TextField } from '../../../../interactors';

const closePaneButton = IconButton({ ariaLabel: 'Close ' });
const searchRequestTextField = TextField({ id: 'input-request-search' });
const searchRequestButton = Pane({ title: 'Search & filter' }).find(Button('Search'));

export default {

  removeCreatedRequest() {
    cy.do([
      Pane({ title: 'Request Detail' }).find(Button('Actions')).click(),
      Button({ id: 'clickable-cancel-request' }).click(),
    ]);
  },

  findCreatedRequest(title) {
    cy.do(cy.get('#input-request-search').type(title));
    cy.do(searchRequestButton.click());
  },

  selectAwaitingDeliveryRequest() {
    cy.get('[name="Open - Awaiting delivery"]').click();
  },

  selectAwaitingPickupRequest() {
    cy.get('[name="Open - Awaiting pickup"]').click();
  },

  selectInTransitRequest() {
    cy.get('[name="Open - In transit"]').click();
  },

  selectNotYetFilledRequest() {
    cy.get('[name="Open - Not yet filled"]').click();
  },

  selectAllOpenRequests() {
    this.selectAwaitingDeliveryRequest();
    this.selectAwaitingPickupRequest();
    this.selectInTransitRequest();
    this.selectNotYetFilledRequest();
  },

  selectFirstRequest() {
    cy.do(MultiColumnListCell({ row: 0, columnIndex: 1 }).click());
  },

  openTagsPane() {
    cy.do(Button({ id: 'clickable-show-tags' }).click());
  },

  selectTags() {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1800);
    cy.do(Pane({ title: 'Tags' }).find(MultiSelect()).select(['urgent']));
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
  },

  closePane(title) {
    cy.do(Pane({ title }).find(closePaneButton).click());
  },

  verifyAssignedTags() {
    cy.expect(cy.get('#multiselect-input-input-tag').should('have.value', 'urgent'));
  },
};
