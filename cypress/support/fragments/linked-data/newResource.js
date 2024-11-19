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

  setPartName(partName) {
    cy.wait(1000);
    cy.xpath('//div[@class="label" and text()="Part name"]/../../div/input')
      .focus()
      .should('not.be.disabled')
      .type(partName);
  },

  setTitle(title) {
    cy.wait(1000);
    cy.xpath('//div[@class="label" and text()="Preferred Title for Work"]/../../div/input')
      .focus()
      .should('not.be.disabled')
      .type(title);
  },

  setSummaryNote(note) {
    cy.wait(1000);
    cy.xpath('//div[@class="label" and text()="Summary note"]/../../div/input')
      .focus()
      .should('not.be.disabled')
      .type(note);
  },
};
