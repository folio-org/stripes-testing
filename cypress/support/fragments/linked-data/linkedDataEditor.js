import { CheckBox, including } from '@interactors/html';
import { Button, Option } from '../../../../interactors';

import EditResource from './editResource';
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
const searchSelect = "//select[@id='id-search-select']";
const searchButton = Button({ dataTestID: 'id-search-button' });
const workPreviewPanel = "//div[@class='preview-panel']";
const actionsHubButton = Button({ dataTestID: 'hubs-actions-dropdown' });
const newHubButton = Button({ dataTestID: 'hubs-actions-dropdown__option-ld.newHub' });

export default {
  waitLoading: () => {
    cy.xpath(searchSelect).should('be.visible');
    cy.xpath(searchSection).should('be.visible');
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
    cy.xpath(workPreviewPanel).should('be.visible');
  },

  editInstanceFromSearchTable: (rowNumber, instanceNumber) => {
    cy.xpath(
      `(//div[@class='search-result-entry-container'][${rowNumber}]//table[contains(@class, 'table instance-list')]//button[contains(text(), 'Edit')])[${instanceNumber}]`,
    ).click();
    EditResource.waitLoading();
  },

  openNewResourceForm: () => {
    cy.do(actionsWorkButton.click());
    cy.do(newResourceButton.click());
  },

  openNewHubForm: () => {
    cy.do(actionsHubButton.click());
    cy.do(newHubButton.click());
  },

  editWork: () => {
    cy.xpath("//div[@class='full-display-control-panel']//button[text()='Edit work']").click();
    EditResource.waitLoading();
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
    InventoryInstance.editInstanceInLde();
    PreviewResource.waitLoading();
    PreviewResource.clickContinue();
    // edit edition
    EditResource.waitLoading();
    EditResource.setEdition(title);
    EditResource.setValueForTheField(this.generateValidLccn(), 'LCCN');
    EditResource.saveAndClose();
    // search for LDE is displayed
    SearchAndFilter.waitLoading();
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
