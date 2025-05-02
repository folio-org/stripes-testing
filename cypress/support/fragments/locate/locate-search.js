import { Heading, including } from '../../../../interactors';

export default {
  searchBy(option, value) {
    // select search option
    cy.xpath('//button[contains(@class,"searchOptionsDropdown")]')
      .should('not.be.disabled')
      .click();
    cy.xpath(`//li[text()='${option}']`).click();

    cy.wait(1000);

    // set search value
    cy.xpath('//input[contains(@class,"search")]')
      .focus()
      .should('not.be.disabled')
      .clear()
      .type(value)
      .type('{enter}');
  },

  clickOnHomeButton() {
    cy.xpath('//a[@href="/search"]').should('be.visible').click();
    cy.expect(
      Heading(including('Choose a filter or enter a search query to show results.')).exists(),
    );
  },

  verifyHomePageDisplayed() {
    // check search options
    cy.xpath('//button[contains(@class,"searchOptionsDropdown")]').should('be.visible');

    // check search input
    cy.xpath('//input[contains(@class,"search")]').should('be.visible');

    // check advanced search
    cy.xpath('//a[@href="/advanced-search"]').should('be.visible');

    // check user profile button
    cy.xpath('//button[@aria-controls="account-info-panel"]').should('be.visible');

    // check filtering options
    const filtering = [
      'Item status',
      'Format',
      'Location',
      'Publisher',
      'Language',
      'Subject',
      'Publication year',
    ];
    filtering.forEach((option) => {
      cy.xpath(`//button[contains(@aria-label,"${option}")]`).should('be.visible');
    });
  },
};
