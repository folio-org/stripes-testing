import TopMenu from '../../support/fragments/topMenu';
import {
  Select,
  Heading,
  Button,
  Page,
  TextField,
  MultiColumnList,
  including,
} from '../../../interactors';

// util for visiting View all page
const gotoViewAllScreen = () => cy.do([Button('View all').click()]);

// util for searching with term
const searchWithTerm = (term) => (
  cy.do([
    TextField('Search ').fillIn(term),
    Button('Search').click(),
  ]));

// util for selecting option
const selectOption = (option) => cy
  .do([Select({ id: 'input-job-logs-search-qindex' }).choose(option)]);

describe('ui-data-import: "View all" log screen', () => {
  before('uploads a file', () => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.visit(TopMenu.dataImportPath);
    const filePath = 'CatShipEC11112.mrc';
    cy.uploadFile(filePath);
  });

  beforeEach('navigates to "Data import > View all" page', () => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.visit(TopMenu.dataImportPath);
    gotoViewAllScreen();
  });

  describe('"View all" log screen', () => {
    it('opens "View all" log page', () => {
      const expectedSearchHeader = 'Search & filter';
      const expectedPath = 'job-logs?sort=-completedDate';

      cy.expect(Heading(including(expectedSearchHeader)).exists());
      cy.expect(Page.has({ url: including(expectedPath) }));
    });
  });

  describe('Searches by "Keyword" by default', () => {
    beforeEach(() => {
      const searchTerm = '11';
      searchWithTerm(searchTerm);
    });

    it('allows to search with "Keyword"', () => {
      cy.expect(MultiColumnList({ id: 'list-data-import' }).has({ rowCount: 1 }));
    });
  });

  describe('Searches by "ID"', () => {
    beforeEach(() => {
      const searchTerm = 'c';
      selectOption('ID');
      searchWithTerm(searchTerm);
    });

    it('allows to search with "ID"', () => {
      // cy.expect(MultiColumnList({ id: 'list-data-import' }).has({ visible: false }));
      cy.get('#list-data-import').should('not.exist');
    });
  });

  describe('Searches by "File name"', () => {
    beforeEach(() => {
      const searchTerm = 'cat';
      selectOption('File name');
      searchWithTerm(searchTerm);
    });

    it('allows to search with "File name"', () => {
      cy.expect(MultiColumnList({ id: 'list-data-import' }).has({ rowCount: 1 }));
    });
  });
});
