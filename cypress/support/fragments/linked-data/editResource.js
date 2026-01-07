import newInstance from './newInstance';

const actionsButton = "//button[@data-testid='edit-control-actions-toggle']";
const instanceActionsButton = "//button[@data-testid='preview-actions-dropdown']";
const duplicateButton = "//button[@data-testid='edit-control-actions-toggle__option-ld.duplicate']";
const newInstanceActionsButton =
  "//button[@data-testid='preview-actions-dropdown__option-ld.newInstance']";
const viewMarcButton = "//button[@data-testid='edit-control-actions-toggle__option-ld.viewMarc']";
const editWorkButton = "//button[text()='Edit work']";
const selectMarcAuthModal =
  "//h3[text()='Select MARC authority']/ancestor::*[@data-testid='modal']";
const editResourceSection = "//div[@id='edit-section']";
const searchMarcAuthInputField = "//textarea[@id='id-search-textarea']";
const newInstanceButton = "//button[@data-testid='new-instance']";

export default {
  waitLoading() {
    cy.xpath(editResourceSection).should('be.visible');
  },

  saveAndKeepEditing() {
    cy.xpath('//button[@data-testid="save-record-and-keep-editing"]').click();
    cy.wait(1000);
  },

  saveAndClose() {
    cy.xpath('//button[@data-testid="save-record-and-close"]').click();
    cy.wait(1000);
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

  setNoteValue(value, field) {
    cy.wait(1000);
    cy.xpath(`//div[@class="label" and text()="${field}"]/../../div/div/input`)
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
    cy.xpath(editResourceSection).should('be.visible');
  },

  openNewInstanceFormViaActions() {
    cy.xpath(instanceActionsButton).click();
    cy.xpath(newInstanceActionsButton).click();
    newInstance.waitLoading();
  },

  openNewInstanceFormViaNewInstanceButton() {
    cy.xpath(newInstanceButton).should('be.visible');
    cy.xpath(newInstanceButton).click();
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
    cy.xpath(editResourceSection).should('be.visible');
  },

  selectChangeCreatorOfWork(buttonNumber) {
    cy.xpath(
      `(//button[contains(@data-testid, 'changeComplexFieldValue')])[${buttonNumber}]`,
    ).should('be.visible');
    cy.xpath(
      `(//button[contains(@data-testid, 'changeComplexFieldValue')])[${buttonNumber}]`,
    ).click();
    // check that modal is displayed
    cy.xpath(selectMarcAuthModal).should('be.visible');
  },

  switchToSearchTabMarcAuthModal() {
    cy.xpath("//button[@data-testid='id-search-segment-button-authorities:search']").click();
  },

  switchToBrowseTabMarcAuthModal() {
    cy.xpath("//button[@data-testid='id-search-segment-button-browse']").click();
  },

  selectSearchParameterMarcAuthModal(option) {
    cy.wait(1000);
    cy.xpath("//select[@id='id-search-select']").select(option);
  },

  searchMarcAuthority(keyword) {
    cy.wait(1000);
    cy.xpath(searchMarcAuthInputField).focus().should('not.be.disabled').clear();
    // break the chain since test fails here from time to time otherwise
    cy.xpath(searchMarcAuthInputField).type(keyword);
    // click on search button
    cy.xpath("//button[@data-testid='id-search-button']").click();
  },

  selectAssignMarcAuthorityButton(rowNumber) {
    cy.xpath(`(//button[contains(@data-testid, 'assign-button')])[${rowNumber}]`).click();
    // modal should be closed
    cy.xpath(selectMarcAuthModal).should('not.be.visible');
    cy.xpath(editResourceSection).should('be.visible');
  },

  checkLabelTextValue(sectionName, textValue) {
    cy.xpath(
      `//div[text()='${sectionName}']/../../..//span[@data-testid='complex-lookup-selected-label' and text()='${textValue}']`,
    ).should('be.visible');
  },

  clickCancelWithOption(option) {
    cy.xpath('//button[@data-testid="close-record-button"]').click();
    // modal is displayed
    cy.xpath("//div[@class='modal-header']//h3[text()='Close resource']").should('be.visible');
    if (option.toLowerCase() === 'yes') {
      cy.xpath("//button[@data-testid='modal-button-cancel']").click();
    } else {
      cy.xpath("//button[@data-testid='modal-button-submit']").click();
      this.waitLoading();
    }
  },

  checkTextValueOnField(textValue, section) {
    cy.xpath(
      `//div[text()="${section}"]/../..//input[@class="input edit-section-field-input" and @value="${textValue}"]`,
    ).should('be.visible');
  },

  checkHeadingProfile(profileName) {
    cy.xpath(`//strong[@class='heading' and contains(text(), '${profileName}')]`)
      .scrollIntoView()
      .should('be.visible');
  },

  clickCloseResourceButton() {
    cy.xpath('//button[@data-testid="close-record-button"]').click();
  },
};
