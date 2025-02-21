import LinkedDataEditor from './linkedDataEditor';

export default {
  waitLoading() {
    cy.xpath('//div[@data-testid="modal"]//h3[text()="Advanced search"]').should('be.visible');
  },

  setCondition(rowNumber, condition, value, option, field) {
    // set search value
    cy.xpath(`(//input[@class="input text-input cell-query"])[${rowNumber}]`)
      .focus()
      .should('not.be.disabled')
      .clear();
    cy.xpath(`(//input[@class="input text-input cell-query"])[${rowNumber}]`).type(value);
    // check if condition is not empty - there's no condition for the first row
    if (condition) {
      // set condition (AND, NOT, OR)
      cy.xpath(`(//select[@class="select-input cell-operator"])[${rowNumber - 1}]`).select(
        condition,
      );
    }
    // set option ('Starts with' etc.)
    cy.xpath(`(//select[@class="select-input cell-qualifier"])[${rowNumber}]`).select(option);
    // set field (Title, LCCN etc.)
    cy.xpath(`(//select[@class="select-input cell-identifier"])[${rowNumber}]`).select(field);
  },

  clickSearch() {
    cy.xpath("//button[@data-testid='modal-button-submit']").click();
    // LDE is displayed
    LinkedDataEditor.waitLoading();
  },
};
