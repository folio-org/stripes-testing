import { Button, TextField, Pane, Accordion, SelectionList } from '../../../../interactors';

const internalContactsFilterAccordion = Accordion({ id: 'internal-contacts-filter' });
const selectInternalContactButton = Button({ id: 'agreement-internal-contacts-filter' });
const internalContactFilterList = SelectionList({
  id: 'sl-container-agreement-internal-contacts-filter',
});

export default {
  search(name) {
    cy.wait(1500);
    cy.do(TextField({ id: 'input-agreement-search' }).fillIn(name));
    cy.do(Pane({ id: 'agreements-tab-filter-pane' }).find(Button('Search')).click());
  },

  openInternalContactsFilter() {
    cy.do(
      internalContactsFilterAccordion
        .find(Button({ id: 'accordion-toggle-button-internal-contacts-filter' }))
        .click(),
    );
    cy.expect([
      internalContactsFilterAccordion.has({ open: true }),
      selectInternalContactButton.exists(),
    ]);
  },

  clickSelectInternalContactButton() {
    cy.do(selectInternalContactButton.click());
    cy.expect(internalContactFilterList.exists());
  },

  filterContactByName(userName) {
    cy.do(internalContactFilterList.filter(userName));
  },

  selectContactName(userName) {
    cy.do(internalContactFilterList.select(userName));
    cy.expect(internalContactFilterList.absent());
  },
};
