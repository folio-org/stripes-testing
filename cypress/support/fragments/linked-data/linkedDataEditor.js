import { Option } from '../../../../interactors';
import newResource from './newResource';

const searchSection = "//div[@class='item-search-content']";
const actionsButton = "//button[@data-testid='search-view-actions-dropdown']";
const newResourceButton = "//button[contains(@data-testid,'newResource')]";
const searchSelect = "//select[@id='id-search-select']";
const searchButton = "//button[@data-testid='id-search-button']";
const workPreviewPanel = "//div[@class='preview-panel']";

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

  openNewResourceForm: () => {
    cy.xpath(actionsButton).click();
    cy.xpath(newResourceButton).click();
    newResource.waitLoading();
  },
};