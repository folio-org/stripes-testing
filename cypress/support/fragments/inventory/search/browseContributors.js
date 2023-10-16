import uuid from 'uuid';
import {
  Select,
  TextInput,
  Heading,
  PaneHeader,
  Button,
  Option,
  Section,
  PaneContent,
  HTML,
  including,
  or,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiSelect,
  MultiSelectMenu,
  MultiSelectOption,
  ValueChipRoot,
  Image,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const defaultInstanceAWithContributor = {
  source: 'FOLIO',
  title: `Test_title_A_${getRandomPostfix()}`,
  contributors: [
    {
      name: `__A_test_contributor_${getRandomPostfix()}`,
      primary: false,
    },
  ],
  id: uuid(),
};

const defaultInstanceZWithContributor = {
  source: 'FOLIO',
  title: `Test_title_Z_${getRandomPostfix()}`,
  contributors: [
    {
      name: `__Z_test_contributor_${getRandomPostfix()}`,
      primary: false,
    },
  ],
  id: uuid(),
};

const paneIntanceDetails = PaneContent({ id: 'browse-inventory-results-pane-content' });
const resulstPaneDetails = PaneContent({ id: 'pane-instancedetails-content' });
const resultsPaneHeader = PaneHeader({ id: 'paneHeaderpane-results' });
const recordSelect = Select({ id: 'input-record-search-qindex' });
const instanceRecordSelect = Select({ id: 'input-inventory-search-qindex' });
const recordSearch = TextInput({ id: 'input-record-search' });
const inventoryRecordSearch = TextInput({ id: 'input-inventory-search' });
const contributorsOption = Option('Contributors');
const browseButton = Button({ id: 'mode-navigation-browse' });
const searchButton = Button({ type: 'submit' });
const resetAllButton = Button('Reset all');
const resultsPaneHeaderBrowse = PaneHeader({ id: 'paneHeaderbrowse-inventory-results-pane' });

const typeSelect = Section({ id: 'nameType' });
const nameTypeButton = typeSelect.find(Button('Name type'));
const nameTypeSearch = typeSelect.find(MultiSelect());
const nameTypeClear = typeSelect.find(Button({ icon: 'times-circle-solid' }));
const actionsButton = Button('Actions');
const rowContributorName = (ContributorName, contributorNameType) => MultiColumnListRow(`${ContributorName}${contributorNameType}1`);

export default {
  defaultInstanceAWithContributor,
  defaultInstanceZWithContributor,
  getInstancesWithContributor(titles = ['_a_', '_z_']) {
    return titles.map((title) => {
      const postfix = `${title}_${getRandomPostfix()}`;
      return {
        id: uuid(),
        title: `Test_record_${postfix}`,
        contributors: [
          {
            name: `Test_contributor_${postfix}`,
            primary: false,
          },
        ],
        source: 'FOLIO',
      };
    });
  },
  createInstancesWithContributor() {
    const instances = this.getInstancesWithContributor();

    cy.getAdminToken();
    cy.getInstanceTypes({ limit: 1 }).then((res) => {
      instances.forEach((instance) => {
        instance.instanceTypeId = res[0].id;
      });
    });

    this.getContributorNameTypes().then((res) => {
      const { id, name } = res.body.contributorNameTypes[0];
      instances.forEach((instance) => {
        instance.contributors[0].contributorNameTypeId = id;
        instance.contributors[0].contributorNameType = name;
        instance.contributors[0].contributorTypeText = name;

        this.createInstanceWithContributorViaApi(instance);
      });
    });

    return instances;
  },
  selectContributorsOption() {
    cy.do(recordSelect.choose('Contributors'));
    cy.expect([recordSelect.has({ value: 'contributors' }), nameTypeButton.exists()]);
  },
  expandNameTypeSection() {
    cy.do(nameTypeButton.click());
  },
  expandNameTypeMenu() {
    cy.do(nameTypeSearch.find(Button({ ariaLabel: 'open menu' })).click());
  },
  clearNameTypeOptions() {
    cy.do(nameTypeClear.click());
    cy.expect(nameTypeSearch.find(ValueChipRoot()).absent());
  },
  selectNameTypeOption(option) {
    cy.do(
      MultiSelectMenu()
        .find(MultiSelectOption(including(option)))
        .click(),
    );
    cy.expect(nameTypeSearch.find(ValueChipRoot(option)).exists());
  },
  unselectNameTypeOption(option) {
    cy.do(
      MultiSelectMenu()
        .find(MultiSelectOption(including(option)))
        .click(),
    );
    cy.expect(nameTypeSearch.find(ValueChipRoot(option)).absent());
  },
  removeNameTypeOption(option) {
    cy.do(
      nameTypeSearch
        .find(ValueChipRoot(option))
        .find(Button({ icon: 'times' }))
        .click(),
    );
    cy.expect(nameTypeSearch.find(ValueChipRoot(option)).absent());
  },
  typeNameTypeOption(option) {
    cy.get('#nameType-multiselect-input').type(`${option}{enter}`);
    cy.expect(nameTypeSearch.find(ValueChipRoot(option)).exists());
  },
  select() {
    // cypress can't draw selected option without wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
    this.selectContributorsOption();
  },

  clickBrowseBtn() {
    cy.do(browseButton.click());
  },

  checkBrowseOptions() {
    cy.expect([Option({ value: 'contributors' }).exists(), contributorsOption.exists()]);
    cy.then(() => Option('Call numbers (all)').index()).then((callNumbersOptionIndex) => {
      cy.then(() => contributorsOption.index()).then((contributorsOptionIndex) => {
        expect(contributorsOptionIndex).to.equal(callNumbersOptionIndex + 1);
      });
    });
  },
  checkSearch() {
    cy.expect([
      recordSearch.exists(),
      searchButton.has({ disabled: true }),
      nameTypeButton.exists(),
      Section({ id: 'browse-inventory-filters-pane' }).find(resetAllButton).has({ disabled: true }),
      // TODO add check for Relator term accordeon button after product updates
      Section({ id: 'browse-inventory-results-pane' }).find(Heading('Browse inventory')).exists(),
      Image({
        alt: 'View and manage instance records, holdings records and item records',
      }).exists(),
      PaneHeader({ id: 'paneHeaderbrowse-inventory-results-pane' })
        .find(HTML('Enter search criteria to start browsing'))
        .exists(),
      PaneContent('Browse for results entering a query or choosing a filter.').exists(),
      [],
    ]);
  },

  browse(contributorName) {
    this.searchRecordByName(contributorName);
  },
  searchRecordByName(recordName) {
    cy.do(recordSearch.fillIn(recordName));
    cy.expect(recordSearch.has({ value: recordName }));
    cy.do(searchButton.click());
  },

  verifySearchTerm(contributorName) {
    cy.expect(recordSearch.has({ value: contributorName }));
  },

  checkSearchResultsTable() {
    cy.expect([
      paneIntanceDetails.find(MultiColumnListHeader('Contributor')).exists(),
      paneIntanceDetails.find(MultiColumnListHeader('Type')).exists(),
      paneIntanceDetails.find(MultiColumnListHeader('Relator term')).exists(),
      paneIntanceDetails.find(MultiColumnListHeader('Number of titles')).exists(),
      paneIntanceDetails.find(Button('Previous')).has({ disabled: or(true, false) }),
      paneIntanceDetails.find(Button('Next')).has({ disabled: or(true, false) }),
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
      MultiColumnListCell(contributorA.name).has({
        innerHTML: including(`<strong>${contributorA.name}</strong>`),
      }),
      rowContributorName(contributorA.name, contributorA.contributorNameType).exists(),
      rowContributorName(contributorZ.name, contributorZ.contributorNameType).exists(),
    ]);
  },

  checkSearchResultRecord(record) {
    cy.expect(
      MultiColumnListCell(record).has({ innerHTML: including(`<strong>${record}</strong>`) }),
    );
  },

  checkMissedMatchSearchResultRecord(record) {
    cy.expect([
      HTML({ className: including('missingMatchError') }).has({ text: record }),
      HTML('would be here').exists(),
    ]);
  },

  checkActionsButton(state = 'exists') {
    cy.expect(actionsButton[state]());
  },

  checkSearchResultCount(text) {
    cy.expect(resultsPaneHeader.find(HTML(including(text))).exists());
  },

  checkAuthorityIconAndValueDisplayed(value) {
    cy.expect([
      MultiColumnListCell({ row: 5, columnIndex: 0 }).has({
        innerHTML: including(`<strong>${value}</strong>`),
      }),
      MultiColumnListCell({ row: 5, columnIndex: 0 }).has({ innerHTML: including('<img') }),
      MultiColumnListCell({ row: 5, columnIndex: 0 }).has({
        innerHTML: including('alt="MARC Authorities module">'),
      }),
    ]);
  },

  checkAuthorityIconAndValueDisplayedForMultipleRows(rowCount, value) {
    for (let i = 0; i < rowCount; i++) {
      cy.expect([
        MultiColumnListCell({ row: i + 5, columnIndex: 0 }).has({
          innerHTML: including(`<strong>${value}</strong>`),
        }),
        MultiColumnListCell({ row: i + 5, columnIndex: 0 }).has({ innerHTML: including('<img') }),
        MultiColumnListCell({ row: i + 5, columnIndex: 0 }).has({
          innerHTML: including('alt="MARC Authorities module">'),
        }),
      ]);
    }
  },

  checkSearchResultRow(contributorName, contributorNameType, contributorType, numberOfTitles) {
    cy.expect(
      MultiColumnListRow(
        `${contributorName}${contributorNameType}${contributorType}${numberOfTitles}`,
      ).exists(),
    );
  },

  checkContributorRowValues: (values) => {
    cy.intercept('GET', '/browse/contributors/instances?*').as('getInstances');
    cy.wait('@getInstances', { timeout: 10000 }).then((item) => {
      cy.expect(item.response.body.items[5]).to.include(values);
    });
  },

  openInstance(contributor) {
    cy.do(MultiColumnListCell(contributor.name).hrefClick());
  },

  openRecord(record) {
    cy.do(Button(record).click());
  },

  checkInstance(instance) {
    cy.do([
      inventoryRecordSearch.has({ value: instance.contributors[0].name }),
      MultiColumnListCell(instance.contributors[0].name).click(),
    ]);
    cy.expect([
      instanceRecordSelect.has({ value: 'contributor' }),
      resulstPaneDetails
        .find(MultiColumnListCell(instance.contributors[0].contributorTypeText))
        .exists(),
      resulstPaneDetails.find(MultiColumnListCell(instance.contributors[0].name)).exists(),
    ]);
  },

  resetAllInSearchPane() {
    cy.do(resetAllButton.click());
  },

  getContributorNameTypes({ searchParams = { limit: 1 } } = {}) {
    return cy.okapiRequest({
      path: 'contributor-name-types',
      searchParams,
    });
  },

  createInstanceWithContributorViaApi(instanceWithContributor) {
    return cy.okapiRequest({
      method: 'POST',
      path: 'inventory/instances',
      body: instanceWithContributor,
      isDefaultSearchParamsRequired: false,
    });
  },

  checkBrowseQueryText(text) {
    cy.expect(recordSearch.has({ value: text }));
  },

  verifyInventoryBrowsePaneheader() {
    cy.expect([
      resultsPaneHeaderBrowse.exists(),
      PaneHeader({ text: including('records found') }).absent(),
    ]);
  },

  checkNonExactSearchResultForARow(browseQuery, rowIndex = 5) {
    cy.expect([
      MultiColumnListRow({ index: rowIndex }).has({
        content: including(`${browseQuery}would be here`),
      }),
    ]);
  },
};
