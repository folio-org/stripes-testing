import uuid from 'uuid';
import { Select, TextInput, Heading, PaneHeader, Form, Button, Option, Section, PaneContent, HTML, including, MultiColumnListCell, Pane, MultiColumnListHeader, MultiColumnListRow, Image, or } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const defaultInstanceAWithContributor = {
  source: 'FOLIO',
  title: `Test_title_A_${getRandomPostfix()}`,
  contributors: [
    {
      name: `__A_test_contributor_${getRandomPostfix()}`,
      primary: false,
    }
  ],
  id: uuid()
};

const defaultInstanceZWithContributor = {
  source: 'FOLIO',
  title: `Test_title_Z_${getRandomPostfix()}`,
  contributors: [
    {
      name: `__Z_test_contributor_${getRandomPostfix()}`,
      primary: false,
    }
  ],
  id: uuid()
};

const paneIntanceDetails = PaneContent({ id: 'browse-inventory-results-pane-content' });
const recordSelect = Select({ id: 'input-record-search-qindex' });
const recordSearch = TextInput({ id: 'input-record-search' });
const contributorsOption = Option('Contributors');
const browseButton = Button({ id: 'mode-navigation-browse' });
const searchButton = Button({ type: 'submit' });
const resetAllButton = Button('Reset all');
const searchButtonDisabled = Button({ type: 'submit', disabled: true });
const resetAllButtonDisabled = Button({ className: including('resetButton---n7KP9'), disabled: true });
const nameTypeAccordion = Button({ id: 'accordion-toggle-button-nameType' });
const rowContributorName = (ContributorName, contributorNameType) => MultiColumnListRow(`${ContributorName}${contributorNameType}1`);

export default {
  defaultInstanceAWithContributor,
  defaultInstanceZWithContributor,

  select() {
    // cypress can't draw selected option without wait
    cy.wait(1000);
    cy.do(Select('Search field index').choose('Contributors'));
    cy.expect(nameTypeAccordion.exists());
  },

  clickBrowseBtn() {
    cy.do(browseButton.click());
  },

  checkBrowseOptions() {
    cy.expect([
      Option({ value: 'contributors' }).exists(),
      contributorsOption.exists(),
    ]);
    cy.then(() => Option('Call numbers').index()).then((callNumbersOptionIndex) => {
        cy.then(() => contributorsOption.index()).then((contributorsOptionIndex) => {
            expect(contributorsOptionIndex).to.equal(callNumbersOptionIndex + 1);
        });
    });
  },

  checkSearch() {
    cy.do([
      recordSelect.has({ value: 'contributors' }),
      Select('Search field index').choose('Contributors'),
      recordSearch.fillIn(' '),
    ]);
    cy.expect([
      Form().find(recordSearch).exists(),
      Form().find(searchButtonDisabled).exists(),
      Button({ id: 'accordion-toggle-button-nameType' }).exists(),
      Section({ id: 'browse-inventory-filters-pane' }).find(resetAllButtonDisabled).exists(),
      // TODO add check for Relator term accordeon button after product updates
      Section({ id: 'browse-inventory-results-pane' }).find(Heading('Browse inventory')).exists(),
      Image({ alt: 'View and manage instance records, holdings records and item records' }).exists(),
      PaneHeader({ id: 'paneHeaderbrowse-inventory-results-pane' }).find(HTML('Enter search criteria to start browsing')).exists(),
      PaneContent('Browse for results entering a query or choosing a filter.').exists(),[]
    ]);
  },

  browse(contributorName) {
    cy.do(recordSearch.fillIn(contributorName));
    cy.expect(recordSearch.has({ value: contributorName }));
    cy.do(searchButton.click());
  },

  checkSearchResultsTable() {
    cy.do([
      MultiColumnListHeader({ id: 'list-column-contributor' }).has({ content: 'Contributor' }),
      MultiColumnListHeader({ id: 'list-column-contributortype' }).has({ content: 'Type' }),
      MultiColumnListHeader({ id: 'list-column-relatorterm' }).has({ content: 'Relator term' }),
      MultiColumnListHeader({ id: 'list-column-numberoftitles' }).has({ content: 'Number of titles' }),
    ]);
    cy.expect([
      Pane({ id: 'pane-results' }).find(MultiColumnListHeader()).exists(),
      Button('Previous').is({ visible: true, disabled: true }),
      or(
        Button('Next').is({ visible: true, disabled: true }),
        Button('Next').is({ visible: true, disabled: false })
      ),
    ]);
  },

  checkNonExactSearchResult(contributorA, contributorZ) {
    cy.expect([
      MultiColumnListRow({ index: 0 }).has({ content: '__A_test_contributor_would be here' }),
      rowContributorName(contributorA.name, contributorA.contributorNameType).exists(),
      rowContributorName(contributorZ.name, contributorZ.contributorNameType).exists(),
    ]);
  },

  checkExactSearchResult(contributorA, contributorZ) {
    cy.expect([
      MultiColumnListCell(contributorA.name).has({ innerHTML: including(`<strong>${contributorA.name}</strong>`) }),
      rowContributorName(contributorA.name, contributorA.contributorNameType).exists(),
      rowContributorName(contributorZ.name, contributorZ.contributorNameType).exists(),
    ]);
  },

  checkSearchResultRecord(record) {
    MultiColumnListCell(record).has({ innerHTML: including(`<strong>${record}</strong>`) });
  },

  checkContributorRowValues: (values) => {
    cy.intercept('GET', '/browse/contributors/instances?*').as('getInstances');
    cy.wait('@getInstances', { timeout: 10000 }).then(xhr => {
      cy.expect(xhr.response.body.items[5]).to.include(values);
    });
  },

  openInstance(contributor) {
    cy.do(MultiColumnListCell(contributor.name).click());
  },

  checkInstance(instance) {
    cy.do([
      recordSearch.has({ value: instance.contributors[0].name }),
      MultiColumnListCell(instance.contributors[0].name).click(),
    ]);
    cy.expect([
      recordSelect.has({ value: 'contributors' }),
      paneIntanceDetails.find(MultiColumnListCell(instance.contributors[0].contributorTypeText)).exists(),
      paneIntanceDetails.find(MultiColumnListCell(instance.contributors[0].name)).exists(),
    ]);
  },

  resetAllInSearchPane() {
    cy.do(resetAllButton.click());
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
      isDefaultSearchParamsRequired : false
    });
  },
};
