export default {
  waitLoading() {
    cy.get('div[class*="dashboardContainer"]').should('be.visible');
  },
};
