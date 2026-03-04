import { Button } from '../../../../interactors';
import MARCAuthorityModal from './assignAuthorityHubModal';

const editPage = "//div[@data-testid='edit-page']";
const saveAndCloseButton = Button({ dataTestID: 'save-record-and-close' });
const saveAndKeepEditingButton = Button({ dataTestID: 'save-record-and-keep-editing' });
const assignAuthorityButton = Button({ dataTestID: '--changeComplexFieldValue' });

const duplicateTitlesection = "(//button[@aria-label='Duplicate component'])[2]";
const titleTypeDropdown = "(//select[@data-testid='dropdown-field'])[2]";

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

const languageLookupInput = "(//input[@class='simple-lookup__input'])[2]";
const languageEnglishOption = "//div[contains(@class, 'simple-lookup__option')][1]";

export default {
  verifyActiveSaveButtons: (isActive) => {
    cy.expect(saveAndCloseButton.has({ disabled: !isActive }));
    cy.expect(saveAndKeepEditingButton.has({ disabled: !isActive }));
  },

  waitLoading: () => {
    cy.xpath(editPage).should('be.visible');
    cy.expect(saveAndCloseButton.has({ disabled: true }));
    cy.expect(saveAndKeepEditingButton.has({ disabled: true }));
  },

  saveAndKeepEditing: () => {
    cy.do(saveAndKeepEditingButton.click());
    cy.wait(500);
    cy.xpath(editPage).should('be.visible');
  },
  saveAndClose: () => {
    cy.do(saveAndCloseButton.click());
    cy.wait(500);
    cy.xpath(editPage).should('not.exist');
  },

  assignAuthority: (name) => {
    cy.do(assignAuthorityButton.click());
    MARCAuthorityModal.waitLoading();
    MARCAuthorityModal.selectSearchOption();
    MARCAuthorityModal.searchByKeyword(name);
    MARCAuthorityModal.assignFoundAuthority();
  },

  fillPreferredTitle: (title, partNum, partName, otherTitle) => {
    cy.xpath(preferredTitleField).type(title);
    cy.wait(200);
    cy.xpath(partNumberField).type(partNum);
    cy.wait(200);
    cy.xpath(partNameField).type(partName);
    cy.wait(200);
    cy.xpath(otherTitleField).type(otherTitle);
    cy.wait(200);
  },

  clickDuplicateTitleButton: () => {
    cy.xpath(duplicateTitlesection).click();
  },

  selectVariantTitleType: () => {
    cy.xpath(titleTypeDropdown).select('Variant Title');
  },

  fillVariantTitle: (title, partNum, partName, otherTitle, date, type, note) => {
    cy.xpath(variantTitleField).type(title);
    cy.wait(200);
    cy.xpath(variantPartNumberField).type(partNum);
    cy.wait(200);
    cy.xpath(variantPartNameField).type(partName);
    cy.wait(200);
    cy.xpath(variantOtherTitleField).type(otherTitle);
    cy.wait(200);
    cy.xpath(variantDateField).type(date);
    cy.wait(200);
    cy.xpath(variantTypeField).type(type);
    cy.wait(200);
    cy.xpath(variantNoteField).type(note);
    cy.wait(200);
  },

  fillLanguage: (language) => {
    cy.xpath(languageLookupInput).type(language);
    cy.xpath(languageEnglishOption).click();
    cy.wait(200);
  },
};
