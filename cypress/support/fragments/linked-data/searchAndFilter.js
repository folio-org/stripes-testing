import { Button, TextInput } from '../../../../interactors';

const searchButton = Button({ dataTestID: 'id-search-button' });
const resetButton = Button({ dataTestID: 'id-search-reset-button' });
const hubsTabButton = Button({ dataTestID: 'id-search-segment-button-hubs' });
const workInstancesTabButton = Button({ dataTestID: 'id-search-segment-button-resources' });
const sourceLocalOption = "//input[@id='search-source-option-local']";
const sourceLoCOption = "//input[@id='search-source-option-libraryOfCongress']";
const hubsSearchInput = TextInput({ id: 'id-search-input' });

export default {
  waitLoading: () => {
    cy.get('[class*="search-pane"]').should('exist');
    cy.get('[class*="item-search-content"]')
      .contains('Enter search criteria to start search')
      .should('exist');
  },

  switchToHubsTab: () => {
    cy.do(hubsTabButton.click());
  },

  switchToWorkInstancesTab: () => {
    cy.do(workInstancesTabButton.click());
  },

  selectSourceLocalOption: () => {
    cy.xpath(sourceLocalOption).click();
  },

  selectSourceLoCOption: () => {
    cy.xpath(sourceLoCOption).click();
  },

  verifyActiveButtons: (isActive) => {
    cy.expect(searchButton.has({ disabled: !isActive }));
    cy.expect(resetButton.has({ disabled: !isActive }));
  },

  searchResourceByTitle: (title) => {
    cy.get('#id-search-select').select('Title');
    cy.get('#id-search-input').clear().type(title);
    cy.get(searchButton).click();
  },

  searchResourceByIsbn: (isbn) => {
    cy.get('#id-search-select').select('ISBN');
    cy.get('#id-search-input').type(isbn);
    cy.get(searchButton).click();
  },

  searchResourceByContributor: (contributor) => {
    cy.get('#id-search-select').select('Contributor');
    cy.get('#id-search-input').type(contributor);
    cy.get(searchButton).click();
  },

  verifySearchResult(data) {
    cy.get('[class*="search-result-entry-container"]')
      .first()
      .find('[class*="work-details-card"]')
      .find('[class*="details"]')
      .contains(data.creator)
      .should('exist');
    cy.get('[class*="search-result-entry-container"]')
      .first()
      .find('[class*="work-details-card"]')
      .find('[class*="details"]')
      .contains(data.language)
      .should('exist');
    cy.get('[class*="search-result-entry-container"]')
      .first()
      .find('[class*="work-details-card"]')
      .find('[class*="details"]')
      .contains(data.classificationNumber)
      .should('exist');
    cy.get('[class*="table instance-list"]')
      .find('tr[data-testid="table-row"]')
      .first()
      .within(() => {
        cy.get('td').eq(1).should('contain', data.title);
        cy.get('td').eq(2).should('contain', data.isbnIdentifier);
        cy.get('td').eq(3).should('contain', data.lccnIdentifier);
        cy.get('td').eq(4).should('contain', data.publisher);
        cy.get('td').eq(5).should('contain', data.publicationDate);
      });
  },

  verifyNoResultsFound() {
    cy.get('[class*="search-result-entry-container"]').should('not.exist');
    cy.get('[class*="item-search-content"]')
      .contains('No resource descriptions match your query')
      .should('exist');
  },

  checkSearchResultsByTitle(title) {
    cy.xpath(`//button[text()="${title}"]`).should('be.visible');
  },

  selectAdvancedSearch() {
    cy.xpath('//button[@class="button button-link search-button"]').click();
  },

  fillHubsSearchInput(searchQuery) {
    cy.do(hubsSearchInput.fillIn(searchQuery));
    cy.wait(200);
    cy.expect(searchButton.is({ disabled: false }));
    cy.expect(resetButton.is({ disabled: false }));
    cy.do(searchButton.click());
    cy.wait(500);
  },

  clickResetButton() {
    cy.do(resetButton.click());
    cy.wait(500);
  },
};
