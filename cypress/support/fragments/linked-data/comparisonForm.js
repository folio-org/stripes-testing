import EditResource from './editResource';

const comparisonSection = "//section[@class='comparison']";

export default {
  waitLoading: () => {
    cy.xpath(comparisonSection).should('be.visible');
  },

  editInstance(instanceTitle) {
    // select instance to be edited by the title
    // section[@class='comparison']//h3//span[text()='Instance AQA title 397.6468909927109306']/../..//button[@data-testid='preview-actions-dropdown']
    cy.xpath(
      `${comparisonSection}//h3//span[text()='${instanceTitle}']/../..//button[@data-testid='preview-actions-dropdown']`,
    ).click();
    cy.xpath(
      `${comparisonSection}//h3//span[text()='${instanceTitle}']/../..//button[contains(@data-testid, 'edit')]`,
    ).click();
    EditResource.waitLoading();
  },

  verifyComparisonSectionDisplayed() {
    // check previous and next buttons
    cy.xpath(`${comparisonSection}//button[@data-testid='backward-button']`).should('be.visible');
    cy.xpath(`${comparisonSection}//button[@data-testid='forward-button']`).should('be.visible');
  },
};
