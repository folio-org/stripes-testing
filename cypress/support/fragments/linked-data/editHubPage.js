import { Button } from '../../../../interactors';

const editPage = "//div[@data-testid='edit-page']";
const saveAndCloseButton = Button({ dataTestID: 'save-record-and-close' });
const saveAndKeepEditingButton = Button({ dataTestID: 'save-record-and-keep-editing' });
const cancelButton = Button('Cancel');
const closeEditPageButton = Button({ ariaLabel: 'Close edit page' });
const creatorNameField = "//span[@data-testid='complex-lookup-selected-label']";
const deleteCreatorButton = "//button[@data-testid='complex-lookup-selected-delete']";
const changeCreatorButton = "//button[@data-testid='--changeComplexFieldValue']";

export default {
  waitLoading: () => {
    cy.xpath(editPage).should('be.visible');
    return cy.url().then((url) => {
      const match = url.match(/resources\/([^/]+)\/edit/);
      return match ? match[1] : null;
    });
  },

  verifyButtons(saveActive = false) {
    cy.expect(closeEditPageButton.exists());
    cy.expect(closeEditPageButton.has({ disabled: false }));
    cy.expect(cancelButton.exists());
    cy.expect(cancelButton.has({ disabled: false }));
    if (saveActive) cy.expect(saveAndCloseButton.exists());
    cy.expect(saveAndCloseButton.has({ disabled: !saveActive }));
    if (saveActive) cy.expect(saveAndKeepEditingButton.exists());
    cy.expect(saveAndKeepEditingButton.has({ disabled: !saveActive }));
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
    const checkInputHasValue = (value) => {
      cy.get('[data-testid="literal-field"]').then(($inputs) => {
        const values = [...$inputs].map((el) => el.value);
        cy.log(`[verifyTitleInformation] input values: ${JSON.stringify(values)}`);
        cy.log(`[verifyTitleInformation] looking for input: "${value}"`);
      });
      cy.get('[data-testid="literal-field"]').should(($inputs) => {
        const values = [...$inputs].map((el) => el.value);
        expect(values).to.include(value);
      });
    };
    const checkDropdownHasValue = (value) => {
      cy.get('[data-testid="dropdown-field"]').then(($selects) => {
        const values = [...$selects].map((el) => el.value);
        cy.log(`[verifyTitleInformation] dropdown values: ${JSON.stringify(values)}`);
        cy.log(`[verifyTitleInformation] looking for dropdown: "${value}"`);
      });
      cy.get('[data-testid="dropdown-field"]').should(($selects) => {
        const values = [...$selects].map((el) => el.value);
        expect(values).to.include(value);
      });
    };

    if (type1) checkDropdownHasValue(type1);
    if (varTitle) checkInputHasValue(varTitle);
    if (varPartNumber) checkInputHasValue(varPartNumber);
    if (varPartName) checkInputHasValue(varPartName);
    if (varOtherTitle) checkInputHasValue(varOtherTitle);
    if (varDate) checkInputHasValue(varDate);
    if (varType) checkInputHasValue(varType);
    if (varNote) checkInputHasValue(varNote);
    if (type2) checkDropdownHasValue(type2);
    if (prefTitle) checkInputHasValue(prefTitle);
    if (partNumber) checkInputHasValue(partNumber);
    if (partName) checkInputHasValue(partName);
    if (otherTitle) checkInputHasValue(otherTitle);
  },

  verifyTitleSectionByIndex(index, { type, title } = {}) {
    const titleGroupId = `Profile::0__Hub::0__title::${index}`;
    if (type) {
      cy.get(`[id="${titleGroupId}"]`)
        .closest('.field-with-meta-controls-container')
        .find('[data-testid="dropdown-field"]')
        .first()
        .should('have.value', type);
    }
    if (title) {
      cy.get(`[id*="${titleGroupId}"][id*="mainTitle::0"]`)
        .closest('.field-with-meta-controls-container')
        .find('[data-testid="literal-field"]')
        .should('have.value', title);
    }
  },

  verifyAllTitleSections(sections) {
    sections.forEach((section, index) => {
      this.verifyTitleSectionByIndex(index, section);
    });
  },

  verifyLanguageCode: (language) => {
    cy.xpath(`//div[text()='${language}']`).should('be.visible');
  },

  updatePreferredTitle: (updatedTitle) => {
    cy.get('[id*="Title$$PreferredTitle"][id*="mainTitle::0"]')
      .siblings('.children-container')
      .find('[data-testid="literal-field"]')
      .type(updatedTitle);
    cy.wait(200);
  },

  saveAndClose: () => {
    cy.intercept('PUT', '**/linked-data/resource/**').as('saveHubAndClose');
    cy.do(saveAndCloseButton.click());

    return cy.wait('@saveHubAndClose').then((interception) => {
      const hubId = interception.response.body.resource['http://bibfra.me/vocab/lite/Hub'].id;
      cy.xpath(editPage).should('not.exist');
      return cy.wrap(hubId);
    });
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

  clickCancel() {
    cy.do(cancelButton.click());
    cy.wait(1000);
  },
};
