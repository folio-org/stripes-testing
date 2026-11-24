import {
  Button,
  including,
  MultiColumnList,
  NavListItem,
  Pane,
  Selection,
} from '../../../../interactors';

const navigationPane = Pane('Navigation');
const schemaSelection = Selection('Schema');
const tableSelection = Selection('Table');
const submitButton = Button('Submit');
const resultsMessageSelector = '[data-cy="results.message"]';

export const REPORTING_NAV_ITEMS = {
  BUILD_QUERY: 'Build query',
  LOAD_QUERY: 'Load query',
  DATABASE_INFO: 'Database info',
  RUN_REPORT: 'Run report',
};

export const DATABASE_INFO_TABS = {
  UPDATES: 'Last updates of tables',
  PROCESSES: 'Long-running processes',
};

export default {
  waitLoading() {
    cy.expect(navigationPane.exists());
  },

  verifyNavItemsDisplayed(items = Object.values(REPORTING_NAV_ITEMS)) {
    items.forEach((item) => {
      cy.expect(navigationPane.find(NavListItem(including(item))).exists());
    });
  },

  openNavItem(item) {
    cy.do(navigationPane.find(NavListItem(including(item))).click());
  },

  verifyQueryBuilderDisplayed() {
    cy.expect([schemaSelection.exists(), tableSelection.exists()]);
  },

  selectTable(schema, table) {
    cy.do(schemaSelection.choose(schema));
    cy.do(tableSelection.choose(table));
  },

  submitQuery() {
    cy.expect(submitButton.has({ disabled: false }));
    cy.do(submitButton.click());
  },

  verifyResultsDisplayed() {
    cy.get(resultsMessageSelector, { timeout: 60000 }).should('be.visible').and('contain', 'Found');
  },

  verifyDatabaseInfoDisplayed() {
    cy.expect(Pane(including('Metadb version')).exists());
    Object.values(DATABASE_INFO_TABS).forEach((tab) => {
      cy.expect(Button(tab).exists());
    });
  },

  openDatabaseInfoTab(tab) {
    cy.do(Button(tab).click());
  },

  verifyResultsListDisplayed() {
    cy.expect(MultiColumnList().exists());
  },
};
