import EditResource from './editResource';

const comparisonSection = "//section[@class='comparison']";

export default {
  waitLoading: () => {
    cy.xpath(comparisonSection).should('be.visible');
  },

  editInstance(instanceTitle) {
    // select instance to be edited by the title
    cy.xpath(
      `${comparisonSection}//h3[text()='${instanceTitle}']/..//button[@data-testid='preview-actions-dropdown']`,
    ).click();
    cy.xpath(
      `${comparisonSection}//h3[text()='${instanceTitle}']/..//button[contains(@data-testid, 'edit')]`,
    ).click();
    EditResource.waitLoading();
  },

  verifyComparisonSectionDisplayed() {
    // check previous and next buttons
    cy.xpath(`${comparisonSection}//button[@data-testid='backward-button']`).should('be.visible');
    cy.xpath(`${comparisonSection}//button[@data-testid='forward-button']`).should('be.visible');
  },
};
