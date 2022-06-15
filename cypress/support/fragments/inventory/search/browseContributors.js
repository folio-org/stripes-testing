import { Select, TextInput, Heading, PaneHeader, Form, Button, Option, Section, PaneContent, HTML, MultiColumnListCell, Pane, MultiColumnListHeader, KeyValue, MultiColumnListRow, Image } from '../../../../../interactors';

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
    cy.then(() => Option('Browse call numbers').index()).then((callNumbersOptionIndex) => {
      cy.then(() => Option('Browse contributors').index()).then((contributorsOptionIndex) => {
        expect(contributorsOptionIndex).to.equal(callNumbersOptionIndex + 1);
      });
    });
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
      Image({ alt: 'View and manage instance records, holdings records and item records' }).exists(),
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
    cy.expect([
      Pane({ id: 'pane-results' }).find(MultiColumnListHeader()).exists(),
      Button('Previous').is({ visible: true, disabled: true }),
      Button('Next').is({ visible: true, disabled: true }),
    ]);
    cy.do(MultiColumnListCell(contributor.name).has({ innerHTML: `<strong>${contributor.name}</strong>` }));
    // TODO add check for contributor.contributorTypeText
  },
  checkInstanceOrder() {
    // TODO add check for alphabetical order
    // '__A_test_contributor_848.0936288305725789Personal name1',
    console.log(MultiColumnListRow({ indexRow: 0 }));
    console.log(MultiColumnListRow({ indexRow: 1 }));
  },
  openInstance(contributor) {
    cy.do(MultiColumnListCell(contributor.name).click());
  },
  checkInstance(instance) {
    cy.expect([
      // TODO: add check for date with format <6/8/2022, 6:46 AM>
      // TODO **"Contributors" - selected search option.
      // TODO *The number of retrieved records equal to "Number of titles" column value of clicked row.
      // TODO *All retrieved records have unique titles, but the same "Contributor" name and "Type" name.
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
