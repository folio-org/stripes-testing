export default {
  waitLoading() {
    cy.xpath("//div[@class='heading' and text()='New instance']").should('be.visible');
  },

  addMainInstanceTitle(title) {
    cy.wait(1000);
    cy.xpath("(//div[text() = 'Title Information']//following::div/div/input)[2]")
      .clear()
      .type(title);
  },

  addInstanceIdentifiers(testData) {
    const resourceIds = testData.resourceIdentifiers;
    // Process the array based on its length
    resourceIds.forEach((element, index) => {
      // select identifier from the dropdown
      cy.wait(1000);
      cy.xpath(`(//div[text() = 'Identifiers'])[${index + 1}]/following::select[1]`).select(
        element.type,
      );
      // add value
      cy.wait(1000);
      cy.xpath(`((//div[text() = 'Identifiers'])[${index + 1}]//following::div/div/input)[1]`).type(
        element.value,
      );
      // Perform click on + for all but the last element
      if (index < resourceIds.length - 1) {
        cy.xpath(
          `(//div[text() = 'Identifiers']/../div[@class='controls-container']/div[@class='duplicate-group']//button[1])[${index + 1}]`,
        ).click();
        cy.wait(1000);
      }
    });
  },
};
