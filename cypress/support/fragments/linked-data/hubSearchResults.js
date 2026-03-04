import { Button } from '@interactors/html';

const hubsSearchResults = "//div[@data-testid='hubs-search-result-list']";
const noSearchResultsMessage = "//div[text()='No resource descriptions match your query']";
const entersearchCriteriaMessage = "//div[text()='Enter search criteria to start search']";
const hubLoCImportEditButton = Button('Import/Edit');
const hubLoCEditButton = Button('Edit');

export default {
  waitLoading: () => {
    cy.xpath(hubsSearchResults).should('be.visible');
  },

  verifiNoSearchResults: () => {
    cy.xpath(hubsSearchResults).should('not.exist');
    cy.xpath(noSearchResultsMessage).should('be.visible');
  },

  verifyEnterSearchCriteriaMessage: () => {
    cy.xpath(hubsSearchResults).should('not.exist');
    cy.xpath(entersearchCriteriaMessage).should('be.visible');
  },

  verifyNumberOfFoundRecords: (number) => {
    cy.xpath("//div[@class='search-control-pane-subLabel']").should(
      'have.text',
      `${number} records found`,
    );
  },

  verifyResourceCalloutMessage: (state) => {
    cy.get('.status-message-text', { timeout: 5000 })
      .should('exist')
      .and(
        'contain',
        `Resource ${state}. Expect a short delay before changes are visible in FOLIO.`,
      );
  },

  verifyLoCSearchResultsByTitle: ({ title, source, actionButton = 'Import/Edit' }) => {
    if (title) {
      cy.get('[data-testid="table-row"]').contains('div', title).should('be.visible');
    }
    if (source) {
      cy.get('[data-testid="table-row"]').contains('span', source).should('be.visible');
    }
    if (actionButton === 'Import/Edit') {
      cy.expect(hubLoCImportEditButton.exists());
    } else if (actionButton === 'Edit') {
      cy.expect(hubLoCEditButton.exists());
    }
  },

  verifySearchResultsByTitle({ creator, title, language, source }) {
    if (creator) {
      cy.get('[data-testid="table-row"]').contains('button', creator).should('be.visible');
    }
    if (title) {
      cy.get('[data-testid="table-row"]').contains('button', title).should('be.visible');
    }
    if (language) {
      cy.get('[data-testid="table-row"]').contains('button', language).should('be.visible');
    }
    if (source) {
      cy.get('[data-testid="table-row"]').contains('span', source).should('be.visible');
    }
    cy.get('[data-testid="table-row"]').contains('button', 'Edit').should('be.enabled');
  },

  clickEditButtonByTitle(title) {
    cy.get('[data-testid="table-row"]')
      .contains('button', title)
      .parents('[data-testid="table-row"]')
      .contains('button', 'Edit')
      .click();
  },
};
