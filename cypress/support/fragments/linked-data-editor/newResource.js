export default {
  waitLoading() {
    cy.xpath("//div[@id='edit-section']").should('be.visible');
  },
};
