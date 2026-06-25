import { CheckBox, including } from '@interactors/html';
import { Button, Option } from '../../../../interactors';

import EditResource, { EDIT_RESOURCE_HEADINGS } from './editResource';
import InventoryInstances from '../inventory/inventoryInstances';
import InventoryInstance from '../inventory/inventoryInstance';
import PreviewResource from './previewResource';
import SearchAndFilter from './searchAndFilter';
import ComparisonForm from './comparisonForm';

const searchSection = "//div[@class='item-search-content']";
const actionsWorkButton = Button({ dataTestID: 'resources-actions-dropdown' });
const newResourceButton = Button({
  dataTestID: 'resources-actions-dropdown__option-ld.newResource',
});
const compareSelectedButton = Button({
  dataTestID: 'resources-actions-dropdown__option-ld.compareSelected',
});
const searchSelect = "//h2[@id='search-pane-header-title']";
const searchButton = Button({ dataTestID: 'id-search-button' });
const workPreviewPanel = "//div[@class='preview-panel']";
const actionsHubButton = Button({ dataTestID: 'hubs-actions-dropdown' });
const newHubButton = Button({ dataTestID: 'hubs-actions-dropdown__option-ld.newHub' });
const editWorkButton = Button('Edit Work');
const editInstanceButton = Button('Edit Instance');

export default {
  waitLoading: () => {
    cy.xpath(searchSelect).should('be.visible');
    cy.xpath(searchSection).should('be.visible');
  },

  clickEditWorkFromSearch() {
    cy.do(editWorkButton.click());
    cy.wait(1000);
  },

  clickEditInstanceFromSearch() {
    cy.do(editInstanceButton.click());
    cy.wait(1000);
  },

  checkSearchOptionIsDisplayed: (option) => {
    cy.expect([Option({ value: option }).exists()]);
  },

  searchByOption: (searchOption, searchQuery) => {
    cy.get('select').select(searchOption);
    cy.get('input').type(searchQuery);
    cy.xpath(searchButton).click();
    // wait until first result is displayed
    cy.xpath("//div[@class='search-result-entry-container'][1]").should('be.visible');
  },

  selectFromSearchTable: (rowNumber) => {
    cy.xpath(
      `//div[@class='search-result-entry-container'][${rowNumber}]//button[contains(@class, 'title')]`,
    ).click();
    cy.wait(500);
    cy.xpath(workPreviewPanel).should('be.visible');
  },

  editInstanceFromSearchTable: (rowNumber, instanceNumber) => {
    cy.xpath(
      `(//div[@class='search-result-entry-container'][${rowNumber}]//table[contains(@class, 'table instance-list')]//button[contains(text(), 'Edit')])[${instanceNumber}]`,
    ).click();
    cy.wait(1000);
    EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
  },

  clickInstanceTitleInSearchTable: (rowNumber, instanceNumber) => {
    cy.xpath(
      `(//div[@class='search-result-entry-container'][${rowNumber}]//table[contains(@class, 'instance-list')]//button[not(contains(text(),'Edit'))])[${instanceNumber}]`,
    )
      .scrollIntoView()
      .should('be.visible')
      .click();
    cy.wait(500);
  },

  openNewResourceForm: () => {
    cy.do(actionsWorkButton.click());
    cy.do(newResourceButton.click());
  },

  openManageProfileSettings() {
    cy.do(actionsWorkButton.click());
    cy.get('[data-testid="resources-actions-dropdown__option-ld.manageProfileSettings"]').click();
  },

  openNewHubForm: () => {
    cy.do(actionsHubButton.click());
    cy.do(newHubButton.click());
  },

  editWork: () => {
    cy.xpath("//div[@class='full-display-control-panel']//button[text()='Edit work']").click();
    cy.wait(1000);
    EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
  },

  generateValidLccn: () => {
    // Generate a random starting character which could be a lowercase letter or '_'
    const firstCharChoices = 'abcdefghijklmnopqrstuvwxyz_';
    const randomFirstChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    const randomSecondChar = firstCharChoices[Math.floor(Math.random() * firstCharChoices.length)];
    // Generating a random sequence of 10 digits
    let randomDigits = '';
    for (let i = 0; i < 10; i++) {
      randomDigits += Math.floor(Math.random() * 10);
    }
    // Combining first char, second char and digits
    const patternString = randomFirstChar + randomSecondChar + randomDigits;
    return patternString;
  },

  createTestWorkDataManuallyBasedOnMarcUpload(title) {
    // create work based on uploaded marc file
    InventoryInstances.searchByTitle(title);
    InventoryInstance.editInstanceInMG();
    PreviewResource.waitLoading();
    PreviewResource.clickContinue();
    EditResource.setEdition(title);
    EditResource.setValueForTheField(this.generateValidLccn(), 'LCCN');
    EditResource.saveAndClose();
    // search for LDE is displayed
    SearchAndFilter.waitLoading();
  },

  createTestWorkDataWithIds(title) {
    InventoryInstances.searchByTitle(title);
    InventoryInstance.editInstanceInMG();
    PreviewResource.waitLoading();
    PreviewResource.clickContinue();
    EditResource.editWorkEditInstance();
    EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
    EditResource.setEdition(title);
    EditResource.setValueForTheField(this.generateValidLccn(), 'LCCN');
    return EditResource.saveAndCloseWithIds().then(({ workId, instanceId, inventoryId }) => {
      SearchAndFilter.waitLoading();
      return cy.wrap({ workId, instanceId, inventoryId });
    });
  },

  selectInstanceForComparisonByTitle(title) {
    cy.do(CheckBox(including(title)).click());
    cy.wait(500);
  },

  openComparisonForm: () => {
    cy.do(actionsWorkButton.click());
    cy.do(compareSelectedButton.click());
    ComparisonForm.waitLoading();
  },

  selectModuleMainHeading() {
    cy.xpath("//a[@id='ModuleMainHeading']").should('be.visible').click();
  },
};
