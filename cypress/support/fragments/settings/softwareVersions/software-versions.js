export default {
  waitLoading() {
    cy.get('//span[@id="platform-versions"]').should('be.visible');
  },

  checkErrorNotDisplayed() {
    cy.get('[role="alert"]').should('not.be.visible');
  },
};
