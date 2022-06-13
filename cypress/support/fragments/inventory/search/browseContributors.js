import { Select, TextInput, Heading, PaneHeader, Form, Button, Option, Section, PaneContent, HTML, MultiColumnListCell, Pane, MultiColumnListHeader, KeyValue } from '../../../../../interactors';

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
      Form().find(Button('Browse')).exists(),
      Form().find(Button('Reset all')).exists(),
      Form().find(Button({ id: 'accordion-toggle-button-nameType' })).exists(),
      // TODO add check for Relator term accordeon button
      Section({ id: 'pane-results' }).find(Heading('Browse inventory')).exists(),
      PaneHeader({ id: 'paneHeaderpane-results' }).find(HTML('Enter search criteria to start browsing')).exists(),
      PaneContent('Browse for results entering a query or choosing a filter.').exists(),
    ]);
  },
  browse(contributorName) {
    cy.do([
      TextInput({ id: 'input-inventory-search' }).fillIn(contributorName),
      Button('Browse').click(),
    ]);
  },
  checkExactSearchResult(contributor) {
    cy.expect(Pane({ id:'pane-results' }).find(MultiColumnListHeader()).exists());
    cy.do(MultiColumnListCell(contributor.name).has({ innerHTML: `<strong>${contributor.name}</strong>` }));
    // TODO add check for contributor.contributorTypeText
  },
  openInstance(contributor) {
    cy.do(MultiColumnListCell(contributor.name).click());
  },
  checkInstance(instance) {
    cy.expect([
      // TODO: add check for date with format <C6/8/2022, 6:46 AM>
      PaneContent({ id: 'pane-instancedetails-content' }).find(KeyValue({ value: instance.title })).exists(),
      PaneContent({ id: 'pane-instancedetails-content' }).find(KeyValue(instance.hrid)).exists(),
      PaneContent({ id: 'pane-instancedetails-content' }).find(KeyValue({ value: instance.source })).exists(),
      PaneContent({ id: 'pane-instancedetails-content' }).find(MultiColumnListCell(instance.contributors[0].contributorTypeText)).exists(),
      PaneContent({ id: 'pane-instancedetails-content' }).find(MultiColumnListCell(instance.contributors[0].name)).exists(),
    ]);
  },
  getContributorNameTypes() {
    return cy.okapiRequest({
      path: 'contributor-name-types',
      searchParams: { limit: 1 },
    });
  },
  createInstanceWithContributorViaApi(instanceWithContributor) {
    return cy.okapiRequest({
      method: 'POST',
      path: 'inventory/instances',
      body: instanceWithContributor,
    });
  }
};
