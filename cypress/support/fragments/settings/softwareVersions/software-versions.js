export default {
  waitLoading() {
    cy.xpath('//span[@id="platform-versions"]').should('be.visible');
  },

  checkErrorNotDisplayed() {
    cy.get('[role="alert"]').should('not.be.visible');
  },
};
