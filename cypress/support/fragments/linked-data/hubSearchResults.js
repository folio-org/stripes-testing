const hubsSearchResults = "//div[@data-testid='hubs-search-result-list']";
const noSearchResultsMessage = "//div[text()='No resource descriptions match your query']";
const entersearchCriteriaMessage = "//div[text()='Enter search criteria to start search']";

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
    cy.xpath('//div[@class=\'search-control-pane-subLabel\']').should(
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

  verifySearchResultsByTitle({ creator, title, language, source }) {
    if (creator) {
      cy.xpath(`//div[@data-testid='table-row']//span[contains(text(), "${creator}")]`).should(
        'be.visible',
      );
    }
    if (title) {
      cy.xpath(`//div[@data-testid='table-row']//span[contains(text(), "${title}")]`).should(
        'be.visible',
      );
    }
    if (language) {
      cy.xpath(`//div[@data-testid='table-row']//span[contains(text(), "${language}")]`).should(
        'be.visible',
      );
    }
    if (source) {
      cy.xpath(`//div[@data-testid='table-row']//span[text()="${source}"]`).should('be.visible');
    }
    cy.xpath('//div[@data-testid=\'table-row\']//button[text()="Edit"]').should('be.enabled');
  },

  clickEditButtonByTitle(title) {
    cy.xpath(
      `//div[@data-testid='table-row']//span[contains(text(), "${title}")]//ancestor::div[@data-testid='table-row']//button[text()="Edit"]`,
    ).click();
  },
};
