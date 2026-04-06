import { Button } from '../../../../interactors';

const actionsButton = Button('Actions');
const workActionsButton = Button({ dataTestID: 'block-actions-toggle' });
const instanceActionsButton = "//button[@data-testid='preview-actions-dropdown']";
const duplicateButton = Button('Duplicate');
const instanceEditActionButton =
  "//button[@data-testid='preview-actions-dropdown__option-ld.edit']";
const newInstanceActionsButton =
  "//button[@data-testid='preview-actions-dropdown__option-ld.newInstance']";
const viewMarcButton = "//button[@data-testid='block-actions-toggle__option-ld.viewMarc']";
const editWorkButton = "//button[text()='Edit work']";
const selectMarcAuthModal =
  "//h3[text()='Select MARC authority']/ancestor::*[@data-testid='modal']";
const editResourceSection = "//div[@id='edit-section']";
const duplicateWorkSection = "//div[@id='app-root']//h2[text()='Duplicate work']";
const searchMarcAuthInputField = "//textarea[@id='id-search-textarea']";
const newInstanceButton = "//button[@data-testid='new-instance']";
const saveKeepEditingButton = Button('Save & keep editing');
const saveAndCloseButton = Button('Save & close');
const editionStatementInput =
  '//div[@class="label" and text()="Edition Statement"]/following-sibling::div[@class="children-container"]/input';
const editWorkBut = Button('Edit work');

export default {
  waitLoading() {
    cy.xpath(editResourceSection).should('be.visible');
  },

  editWorkEditInstance() {
    cy.do(editWorkBut.click());
    cy.wait(1000);
    cy.xpath(instanceActionsButton).click();
    cy.xpath(instanceEditActionButton).click();
    cy.wait(1000);
  },

  saveAndKeepEditing() {
    cy.do(saveKeepEditingButton.click());
    cy.wait(1000);
  },

  saveAndClose() {
    cy.do(saveAndCloseButton.click());
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

  duplicateInstance() {
    cy.expect(actionsButton.exists());
    cy.do(actionsButton.click());
    cy.expect(duplicateButton.exists());
    cy.do(duplicateButton.click());
    cy.wait(1000);
    cy.xpath(editResourceSection).should('be.visible');
  },

  duplicateWork() {
    cy.expect(workActionsButton.exists());
    cy.do(workActionsButton.click());
    cy.expect(duplicateButton.exists());
    cy.do(duplicateButton.click());
    cy.wait(1000);
    cy.xpath(duplicateWorkSection).should('be.visible');
  },

  openNewInstanceFormViaActions() {
    cy.xpath(instanceActionsButton).click();
    cy.xpath(newInstanceActionsButton).click();
  },

  openNewInstanceFormViaNewInstanceButton() {
    cy.xpath(newInstanceButton).should('be.visible');
    cy.xpath(newInstanceButton).click();
  },

  setEdition(edition) {
    cy.wait(1000);
    cy.xpath(editionStatementInput).focus().type(`{selectall}${edition}`);
    cy.wait(1000);
  },

  viewMarc() {
    cy.do(actionsButton.click());
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
    cy.xpath(`//h3[@class='heading' and contains(text(), '${profileName}')]`)
      .scrollIntoView()
      .should('be.visible');
  },

  clickCloseResourceButton() {
    cy.xpath('//button[@data-testid="close-record-button"]').click();
  },
};
