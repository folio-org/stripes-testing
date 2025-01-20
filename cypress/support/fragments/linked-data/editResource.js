import newInstance from './newInstance';

const actionsButton = "//button[@data-testid='edit-control-actions-toggle']";
const duplicateButton = "//button[@data-testid='edit-control-actions-toggle__option-ld.duplicate']";
const viewMarcButton = "//button[@data-testid='edit-control-actions-toggle__option-ld.viewMarc']";
const editWorkButton = "//button[text()='Edit work']";

export default {
  waitLoading() {
    cy.xpath("//div[@id='edit-section']").should('be.visible');
  },

  saveAndKeepEditing() {
    cy.xpath('//button[@data-testid="save-record-and-keep-editing"]').click();
  },

  saveAndClose() {
    cy.xpath('//button[@data-testid="save-record-and-close"]').click();
  },

  checkAlarmDisplayed(isDisplayed) {
    if (isDisplayed) {
      cy.xpath('//span[@class="status-message-text"]').should('be.visible');
    } else {
      cy.xpath('//span[@class="status-message-text"]').should('not.be.visible');
    }
  },

  setValueForTheField(value, field) {
    cy.wait(1000);
    cy.xpath(`//div[@class="label" and text()="${field}"]/../../div/input`)
      .focus()
      .should('not.be.disabled')
      .clear()
      .type(value);
  },

  clearField(field) {
    cy.wait(1000);
    cy.xpath(`//div[@class="label" and text()="${field}"]/../../div/input`)
      .focus()
      .should('not.be.disabled')
      .clear();
  },

  duplicateResource() {
    cy.xpath(actionsButton).click();
    cy.xpath(duplicateButton).click();
    cy.xpath("//div[@id='edit-section']").should('be.visible');
  },

  openNewInstanceForm() {
    cy.xpath("//button[@data-testid='new-instance']").click();
    newInstance.waitLoading();
  },

  setEdition(edition) {
    cy.wait(1000);
    cy.xpath('//div[@class="label" and text()="Edition Statement"]/../../div/div[2]/input')
      .focus()
      .should('not.be.disabled')
      .clear();
    // break the chain since test fails here from time to time otherwise
    cy.wait(1000);
    cy.xpath('//div[@class="label" and text()="Edition Statement"]/../../div/div[2]/input').type(
      edition,
    );
  },

  viewMarc() {
    cy.xpath(actionsButton).click();
    cy.xpath(viewMarcButton).click();
    cy.xpath("//div[@class='view-marc-modal']").should('be.visible');
  },

  clickEditWork() {
    cy.xpath(editWorkButton).click();
    cy.xpath("//div[@id='edit-section']").should('be.visible');
  },

  changeCreatorOfWork() {
    cy.xpath("(//button[contains(@data-testid, 'changeComplexFieldValue')])[1]").click();
  },
};
