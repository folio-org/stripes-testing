import TopMenu from '../../support/fragments/topMenu';
import {
  Select,
  Heading,
  Button,
  Page,
  TextField,
  including,
} from '../../../interactors';

// login util
const login = () => (
  cy.login(
    Cypress.env('diku_login'),
    Cypress.env('diku_password')
  ));

// util for clicking View all button
const clickViewAllButton = () => cy.do([Button('View all').click()]);

// util for searching with term
const searchWithTerm = (term) => (
  cy.do([
    TextField('Search ').fillIn(term),
    Button('Search').click(),
  ]));

// util for selecting option
const selectOption = (option) => cy
  .do([Select({ id: 'input-job-logs-search-qindex' }).choose(option)]);

// util for getting found log rows with id
const getRow = () => cy.get('.mclRowFormatterContainer---ZuaT0 > [role="row"]');

describe('ui-data-import: "View all" log screen', () => {
  beforeEach('navigates to "Data import"', () => {
    login();
    cy.visit(TopMenu.dataImportPath);
  });

  describe('"View all" log screen', () => {
    beforeEach(() => {
      clickViewAllButton();
    });

    it('opens "View all" log page', () => {
      const expectedSearchHeader = 'Search & filter';
      const expectedPath = 'job-logs?sort=-completedDate';

      cy.expect(Heading(including(expectedSearchHeader)).exists());
      cy.expect(Page.has({ url: including(expectedPath) }));
    });
  });

  describe('Searches by "Keyword" by default', () => {
    beforeEach(() => {
      clickViewAllButton();
      const searchTerm = 'ca';
      searchWithTerm(searchTerm);
    });

    it('allows to search with "Keyword"', () => {
      getRow().should('have.length', 1);
    });
  });

  describe('Searches by "ID"', () => {
    beforeEach(() => {
      clickViewAllButton();
      const searchTerm = '1';
      selectOption('ID');
      searchWithTerm(searchTerm);
    });

    it('allows to search with "ID"', () => {
      getRow().should('have.length', 1);
    });
  });

  describe('Searches by "File name"', () => {
    beforeEach(() => {
      clickViewAllButton();
      const searchTerm = 'cat';
      selectOption('File name');
      searchWithTerm(searchTerm);
    });

    it('allows to search with "File name"', () => {
      getRow().should('have.length', 1);
    });
  });
});


