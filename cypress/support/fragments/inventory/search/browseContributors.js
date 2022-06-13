import { Select, TextInput, Heading, PaneHeader, Form, Button, Option, Section, PaneContent, HTML } from '../../../../../interactors';

export default {
  select() {
    // cypress can't draw selected option without wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
    cy.do(Select('Search field index').choose('Browse contributors'));
  },
  checkBrowseOptions() {
    cy.expect([
      Option({ value: 'contributors' }).exists(),
      Option('Browse contributors').exists(),
    ]);
    cy.get('option[value="callNumbers"]').next().should('have.text', 'Browse contributors');
  },
  checkSearch() {
    cy.do([
      Select({ id: 'input-inventory-search-qindex' }).has({ value: 'contributors' }),
      TextInput({ id: 'input-inventory-search' }).fillIn(' '),
    ]);
    cy.expect([
      Form().find(TextInput({ id: 'input-inventory-search' })).exists(),
      Form().find(Button('Reset all')).exists(),
      Form().find(Button('Browse')).exists(),
      Section({ id: 'pane-results' }).find(Heading('Browse inventory')).exists(),
      PaneHeader({ id: 'paneHeaderpane-results' }).find(HTML('Enter search criteria to start browsing')).exists(),
      PaneContent('Browse for results entering a query or choosing a filter.').exists(),
    ]);
  }
};
