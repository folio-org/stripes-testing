export default {
  waitLoading() {
    cy.xpath('//span[@id="platform-versions"]').should('exist');
  },

  checkErrorNotDisplayed() {
    cy.get('[role="alert"]').should('not.be.visible');
  },
};
