import { Button, MultiColumnListCell, MultiSelect, Pane, IconButton, TextArea, ValueChipRoot, Checkbox, TextField, Badge } from '../../../../interactors';

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

  async selectTags(tag) {
    await cy.do(Pane({ title: 'Tags' }).find(MultiSelect()).select(tag));
  },

  closePane(title) {
    cy.do(Pane({ title }).find(IconButton({ ariaLabel: 'Close ' })).click());
  },

  verifyAssignedTags(tag) {
    cy.expect(Button({ id: 'clickable-show-tags' }).find(Badge()).has({ value: '1' }));
    cy.expect(Pane({ title: 'Tags' }).find(ValueChipRoot(tag)).exists());
  },
};
