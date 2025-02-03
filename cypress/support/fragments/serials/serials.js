export default {
  waitLoading: () => {
    // checking xpath since UI for serials doesn't have unique IDs for sections
    cy.xpath("//div[@id='serials-management-module-display']").should('be.visible');
  },
};
