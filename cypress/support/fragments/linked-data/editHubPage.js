import { Button } from '../../../../interactors';

const editPage = "//div[@data-testid='edit-page']";
const saveAndCloseButton = Button({ dataTestID: 'save-record-and-close' });
const saveAndKeepEditingButton = Button({ dataTestID: 'save-record-and-keep-editing' });
const creatorNameField = "//span[@data-testid='complex-lookup-selected-label']";
const deleteCreatorButton = "//button[@data-testid='complex-lookup-selected-delete']";
const changeCreatorButton = "//button[@data-testid='--changeComplexFieldValue']";

const titleTypeDropdown = "(//select[@data-testid='dropdown-field'])[2]";
const titleTypeDropdown2 = "(//select[@data-testid='dropdown-field'])[3]";
const variantTitleField = "(//input[@data-testid='literal-field'])[1]";
const variantPartNumberField = "(//input[@data-testid='literal-field'])[2]";
const variantPartNameField = "(//input[@data-testid='literal-field'])[3]";
const variantOtherTitleField = "(//input[@data-testid='literal-field'])[4]";
const variantDateField = "(//input[@data-testid='literal-field'])[5]";
const variantTypeField = "(//input[@data-testid='literal-field'])[6]";
const variantNoteField = "(//input[@data-testid='literal-field'])[7]";

const preferredTitleField = "(//input[@data-testid='literal-field'])[8]";
const partNumberField = "(//input[@data-testid='literal-field'])[9]";
const partNameField = "(//input[@data-testid='literal-field'])[10]";
const otherTitleField = "(//input[@data-testid='literal-field'])[11]";

export default {
  waitLoading: () => {
    cy.xpath(editPage).should('be.visible');
  },

  deleteViaAPI(hubId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `linked-data/resource/${hubId}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  verifyCreatorOfHub: (creator) => {
    cy.xpath(creatorNameField).should('contain.text', creator);
    cy.xpath(deleteCreatorButton).should('be.visible');
    cy.xpath(deleteCreatorButton).should('be.enabled');
    cy.xpath(changeCreatorButton).should('be.visible');
    cy.xpath(changeCreatorButton).should('be.enabled');
  },

  verifyTitleInformation: ({
    type1,
    varTitle,
    varPartNumber,
    varPartName,
    varOtherTitle,
    varDate,
    varType,
    varNote,
    type2,
    prefTitle,
    partNumber,
    partName,
    otherTitle,
  } = {}) => {
    if (type1) cy.xpath(titleTypeDropdown).should('have.value', type1);
    if (varTitle) cy.xpath(variantTitleField).should('have.value', varTitle);
    if (varPartNumber) cy.xpath(variantPartNumberField).should('have.value', varPartNumber);
    if (varPartName) cy.xpath(variantPartNameField).should('have.value', varPartName);
    if (varOtherTitle) cy.xpath(variantOtherTitleField).should('have.value', varOtherTitle);
    if (varDate) cy.xpath(variantDateField).should('have.value', varDate);
    if (varType) cy.xpath(variantTypeField).should('have.value', varType);
    if (varNote) cy.xpath(variantNoteField).should('have.value', varNote);
    if (type2) cy.xpath(titleTypeDropdown2).should('have.value', type2);
    if (prefTitle) cy.xpath(preferredTitleField).should('have.value', prefTitle);
    if (partNumber) cy.xpath(partNumberField).should('have.value', partNumber);
    if (partName) cy.xpath(partNameField).should('have.value', partName);
    if (otherTitle) cy.xpath(otherTitleField).should('have.value', otherTitle);
  },

  verifyLanguageCode: (language) => {
    cy.xpath(`//div[text()='${language}']`).should('be.visible');
  },

  updateTitle: (updatedTitle) => {
    cy.xpath(preferredTitleField).type(updatedTitle);
    cy.wait(200);
  },

  saveAndClose: () => {
    cy.do(saveAndCloseButton.click());
    cy.wait(2000);
    cy.xpath(editPage).should('not.exist');
  },

  saveAndKeepEditing: () => {
    cy.intercept('PUT', '**/linked-data/resource/**').as('saveHub');
    cy.do(saveAndKeepEditingButton.click());

    return cy.wait('@saveHub').then((interception) => {
      cy.wait(200);
      cy.xpath(editPage).should('be.visible');
      return cy.wrap(interception.response.body.resource['http://bibfra.me/vocab/lite/Hub'].id);
    });
  },
};
