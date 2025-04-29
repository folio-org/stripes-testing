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

  verifySearchResults(value) {
    cy.expect(Heading(including(value)).exists());
  },
};
