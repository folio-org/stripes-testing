import { Accordion, Button, KeyValue, Modal, PaneHeader, Pane } from '../../../../../interactors';

const actionsButton = Button('Actions');

export default {
  closeRoutingListDetails: () => {
    cy.wait(1500);
    cy.do(
      PaneHeader({ id: 'paneHeaderrouting-list-pane' })
        .find(Button({ icon: 'times' }))
        .click(),
    );
    cy.wait(1500);
    cy.expect(Pane({ id: 'routing-list-pane' }).absent());
  },

  checkRoutingListNameDetails(name) {
    cy.expect([
      KeyValue('Name').has({ value: name }),
      actionsButton.exists(),
      Button('Collapse all').exists(),
      Accordion('General information').has({ open: true }),
      Accordion('Users').has({ open: true }),
    ]);
  },

  checkRoutingListNotesDetails(notes) {
    cy.expect(KeyValue('Notes').has({ value: notes }));
  },

  editRoutingList() {
    cy.do([actionsButton.click(), Button('Edit').click()]);
  },

  deleteRoutingList() {
    cy.do([
      actionsButton.click(),
      Button('Delete').click(),
      Modal('Delete Routing list')
        .find(Button({ id: 'clickable-delete-routing-list-confirmation-confirm' }))
        .click(),
    ]);
  },

  deleteRoutingListViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `orders/routing-lists/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
