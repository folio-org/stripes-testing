import { Button, HTML, Heading, Keyboard } from '../../../../interactors';
import closeResourceModal from './closeResourceModal';
import UncontrolledAuthModal from './uncontrolledAuthModal';

export { EDIT_RESOURCE_HEADINGS } from '../../constants';

const actionsButton = Button('Actions');
const workActionsButton = Button({ dataTestID: 'block-actions-toggle' });
const instanceActionsButton = "//button[@data-testid='preview-actions-dropdown']";
const duplicateButton = Button('Duplicate');
const instanceEditActionButton =
  "//button[@data-testid='preview-actions-dropdown__option-ld.edit']";
const newInstanceActionsButton =
  "//button[@data-testid='preview-actions-dropdown__option-ld.newInstance']";
const viewMarcButton = "//button[@data-testid='block-actions-toggle__option-ld.viewMarc']";
const inventoryViewActionsButton =
  "//button[@data-testid='block-actions-toggle__option-ld.inventoryView']";
const editWorkButton = Button('Edit work');
const selectMarcAuthModal =
  "//h3[text()='Select MARC authority']/ancestor::*[@data-testid='modal']";
const searchMarcAuthInputField = '#id-search-textarea';
const newInstanceButton = Button({ dataTestID: 'new-instance' });
const saveKeepEditingButton = Button('Save & keep editing');
const saveAndCloseButton = Button('Save & close');
const cancelButton = Button('Cancel');
const closeResourceButton = Button({ dataTestID: 'nav-close-button' });
const editionStatementInput =
  '//div[@class="label" and text()="Edition Statement"]/following-sibling::div[@class="children-container"]/input';

export default {
  waitLoading(headingText) {
    cy.expect(Heading(headingText).exists());
  },

  editWorkEditInstance() {
    cy.do(editWorkButton.click());
    cy.wait(1000);
    cy.xpath(instanceActionsButton).click();
    cy.xpath(instanceEditActionButton).click();
    cy.wait(1000);
  },

  saveAndKeepEditing() {
    cy.do(saveKeepEditingButton.click());
    cy.wait(2000);
  },

  saveAndKeepEditingWithId() {
    cy.do(saveKeepEditingButton.click());
    cy.wait(2000);
    UncontrolledAuthModal.closeIfDisplayed();
    return cy.url().then((url) => {
      const match = url.match(/resources\/([^/]+)\/edit/);
      const id = match ? match[1] : null;
      return cy.wrap({ resourceId: id });
    });
  },

  saveAndClose() {
    cy.do(saveAndCloseButton.click());
    cy.wait(1000);
  },

  saveAndCloseWithIds() {
    cy.intercept({ method: /^(PUT|POST)$/, url: '**/linked-data/resource/**' }).as(
      'saveResourceRequest',
    );
    cy.do(saveAndCloseButton.click());
    cy.wait(1000);
    UncontrolledAuthModal.closeIfDisplayed();
    return cy.wait('@saveResourceRequest').then((interception) => {
      const body = interception.response.body?.resource;
      const instance = body?.['http://bibfra.me/vocab/lite/Instance'];
      const workId =
        body?.['http://bibfra.me/vocab/lite/Work']?.id ?? instance?._workReference?.[0]?.id ?? null;
      const instanceId = instance?.id ?? null;
      const inventoryId = instance?.folioMetadata?.inventoryId ?? null;
      return cy.wrap({ workId, instanceId, inventoryId });
    });
  },

  saveAndCloseNewInstanceWithId() {
    cy.intercept('POST', '**/linked-data/resource**').as('saveNewInstanceRequest');
    cy.do(saveAndCloseButton.click());
    cy.wait(1000);
    return cy.wait('@saveNewInstanceRequest').then((interception) => {
      const body = interception.response.body?.resource;
      const instance = body?.['http://bibfra.me/vocab/lite/Instance'];
      const instanceId = instance?.id ?? null;
      const inventoryId = instance?.folioMetadata?.inventoryId ?? null;
      return cy.wrap({ instanceId, inventoryId });
    });
  },

  checkAlarmDisplayed(isDisplayed) {
    if (isDisplayed) {
      cy.xpath('//span[@class="status-message-text"]').should('be.visible');
    } else {
      cy.xpath('//span[@class="status-message-text"]').should('not.be.visible');
    }
  },

  checkSuccessStatusDisplayed() {
    cy.xpath('//span[@class="status-message-text" and text()="Resource updated. Expect a short delay before changes are visible in FOLIO."]')
      .should('be.visible');
  },

  clearStatusMessages() {
    // Toasts are stacked in an overlapping way likely obscuring close button; close them all anwyays.
    // eslint-disable-next-line cypress/no-force
    cy.xpath('//section[@data-testid="common-status"]//button[contains(@class, "status-message-close")]')
      .click({ multiple: true, force: true });
    cy.wait(1000);
  },

  toggleSectionMarcTooltip(section) {
    cy.xpath(`//div[text()="${section}"]/following-sibling::div/div[contains(@class, "marc-tooltip-wrapper")]/button`)
      .click();
    cy.wait(500);
  },

  toggleSingleFieldMarcTooltip(field) {
    cy.xpath(
      `//div[text()="${field}"]/ancestor::*[1]//div[contains(@class, "marc-tooltip-wrapper")]/button`,
    ).click();
    cy.wait(500);
  },

  checkMarcTooltipContains(field, mapping) {
    cy.xpath(`//dialog[contains(@class, "marc-tooltip-content")]/div[span[@class="marc-tooltip-field" and normalize-space()="${field}:"] and span[@class="marc-tooltip-mapping" and text()="${mapping}"]]`)
      .scrollIntoView()
      .should('be.visible');
  },

  setValueForTheField(value, field, repeatPosition = 1) {
    cy.wait(1000);
    cy.xpath(`//div[@class="label" and text()="${field}"][${repeatPosition}]/../../div/input`)
      .focus()
      .should('not.be.disabled')
      .clear()
      .type(value);
    cy.wait(1000);
  },

  setValueForSectionFieldDropdown(value, field, section, repeatPosition = 1) {
    cy.wait(1000);
    cy.xpath(`(//div[text()="${section}"]/../../div/following-sibling::div/div[@class="label" and text()="${field}"])[${repeatPosition}]/following-sibling::div/select`)
      .select(value);
    cy.wait(1000);
  },

  openSimpleFieldMenu(field, repeatPosition = 1) {
    cy.wait(1000);
    cy.xpath(
      `(//div[div[@class="label" and text()="${field}"]])[${repeatPosition}]/following-sibling::div//div[contains(@class, "simple-lookup__control")]`,
    )
      .scrollIntoView()
      .click();
    cy.wait(1000);
    cy.do(Keyboard.escape());
  },

  openSimpleSectionFieldMenu(field, repeatPosition = 1) {
    cy.wait(1000);
    cy.xpath(
      `(//div[@class="label" and text()="${field}"])[${repeatPosition}]/following-sibling::div//div[contains(@class, "simple-lookup__control")]`,
    )
      .scrollIntoView()
      .click();
    cy.wait(1000);
    cy.do(Keyboard.escape());
  },

  setValueForSimpleField(value, field, repeatPosition = 1) {
    cy.wait(1000);
    cy.xpath(
      `(//div[@class="label" and text()="${field}"])[${repeatPosition}]/following-sibling::div//div[contains(@class, "simple-lookup__control")]`,
    ).click();
    cy.wait(500);
    cy.xpath(
      `(//div[@class="label" and text()="${field}"])[${repeatPosition}]/following-sibling::div//div[contains(@class, "simple-lookup__menu")]/div/div[text()="${value}"]`,
    ).click();
    cy.wait(1000);
  },

  setValueForSectionSimpleField(value, field, repeatPosition = 1) {
    cy.wait(1000);
    cy.xpath(`(//div[@class="label" and text()="${field}"])[${repeatPosition}]/../../div/following-sibling::div//div[contains(@class, "simple-lookup__control")]`)
      .click();
    cy.wait(500);
    cy.xpath(`(//div[@class="label" and text()="${field}"])[${repeatPosition}]/../../div/following-sibling::div//div[contains(@class, "simple-lookup__menu")]/div/div[text()="${value}"]`)
      .click();
    cy.wait(1000);
  },

  clickRepeatGroup(field) {
    cy.wait(1000);
    cy.xpath(
      `//div[@class="label" and text()="${field}"]/../../div/div[@class="duplicate-group"]/button[1]`,
    ).click();
    cy.wait(1000);
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

  clearSimpleField(field, repeatPosition = 1) {
    cy.wait(1000);
    cy.xpath(
      `(//div[@class="label" and text()="${field}"])[${repeatPosition}]/following-sibling::div//div[contains(@class, "simple-lookup__clear-indicator")]`,
    )
      .scrollIntoView()
      .should('be.visible')
      .click();
  },

  duplicateInstance() {
    cy.expect(actionsButton.exists());
    cy.do(actionsButton.click());
    cy.expect(duplicateButton.exists());
    cy.do(duplicateButton.click());
    cy.wait(1000);
    cy.expect(Heading('Duplicate instance').exists());
  },

  duplicateWork() {
    cy.expect(workActionsButton.exists());
    cy.do(workActionsButton.click());
    cy.expect(duplicateButton.exists());
    cy.do(duplicateButton.click());
    cy.wait(1000);
    cy.expect(Heading('Duplicate work').exists());
  },

  editInstanceFormViaActions() {
    cy.xpath(instanceActionsButton).click();
    cy.xpath(instanceEditActionButton).click();
  },

  openNewInstanceFormViaActions() {
    cy.xpath(instanceActionsButton).click();
    cy.xpath(newInstanceActionsButton).click();
  },

  openNewInstanceFormViaNewInstanceButton() {
    cy.expect(newInstanceButton.exists());
    cy.do(newInstanceButton.click());
  },

  openInventoryViewViaActions() {
    cy.do(workActionsButton.click());
    cy.xpath(inventoryViewActionsButton).click();
  },

  setEdition(edition) {
    cy.wait(1000);
    cy.xpath(editionStatementInput).focus().type(`{selectall}${edition}`);
    cy.wait(1000);
  },

  viewMarc() {
    cy.do(actionsButton.click());
    cy.xpath(viewMarcButton).click();
    cy.wait(1000);
  },

  clickEditWork() {
    cy.do(editWorkButton.click());
    cy.wait(1000);
    cy.expect(HTML({ id: 'edit-section' }).exists());
    cy.wait(1000);
  },

  selectChangeCreatorOfWork(buttonNumber) {
    cy.xpath(
      `(//button[contains(@class, 'complex-lookup-select-button')])[${buttonNumber}]`,
    ).should('be.visible');
    cy.xpath(
      `(//button[contains(@class, 'complex-lookup-select-button')])[${buttonNumber}]`,
    ).click();
    // check that modal is displayed
    cy.xpath(selectMarcAuthModal).should('be.visible');
  },

  switchToSearchTabMarcAuthModal() {
    cy.do(Button({ dataTestID: 'id-search-segment-button-authorities:search' }).click());
  },

  switchToBrowseTabMarcAuthModal() {
    cy.do(Button({ dataTestID: 'id-search-segment-button-browse' }).click());
  },

  selectSearchParameterMarcAuthModal(option) {
    cy.wait(1000);
    cy.xpath("//select[@id='id-search-select']").select(option);
    cy.wait(1000);
  },

  searchMarcAuthority(keyword) {
    cy.wait(1000);
    cy.get(searchMarcAuthInputField).should('not.be.disabled').focus();
    cy.get(searchMarcAuthInputField).type(keyword);
    // click on search button
    cy.do(Button({ dataTestID: 'id-search-button' }).click());
  },

  selectAssignMarcAuthorityButton(rowNumber) {
    cy.get('[data-testid="table-row"]')
      .eq(rowNumber - 1)
      .find('[data-testid*="assign-button"]')
      .click();
    // modal should be closed
    cy.xpath(selectMarcAuthModal).should('not.be.visible');
    cy.expect(HTML({ id: 'edit-section' }).exists());
  },

  checkLabelTextValue(sectionName, textValue) {
    cy.xpath(
      `//div[text()='${sectionName}']/../../..//span[@data-testid='complex-lookup-selected-label' and text()='${textValue}']`,
    ).should('be.visible');
  },

  checkDropdownContainsOptions(field, optionLabels) {
    cy.xpath(
      `//div[text()="${field}"]/../following-sibling::div//select/option`
    ).then(($options) => {
      const labels = [...$options].map(opt => opt.text);
      expect(labels).to.include.members(optionLabels);
    });
  },

  checkSectionDropdownContainsOptions(section, field, optionLabels, repeatPosition = 1) {
    cy.xpath(
      `(//div[text()='${section}']/../../div/following-sibling::div/div[@class="label" and text()="${field}"])[${repeatPosition}]/following-sibling::div/select/option`
    ).then(($options) => {
      const labels = [...$options].map(opt => opt.text);
      expect(labels).to.include.members(optionLabels);
    });
  },

  checkSimpleFieldDropdownContainsOptions(field, optionLabels, repeatPosition = 1) {
    cy.wait(500);
    cy.xpath(`(//div[@class="label" and text()="${field}"])[${repeatPosition}]/../../div//div[contains(@class, "simple-lookup__control")]`)
      .click();
    cy.wait(1000);
    cy.xpath(`(//div[@class="label" and text()="${field}"])[${repeatPosition}]/../../div//div[contains(@class, "simple-lookup__menu")]/div/div`)
      .then(($options) => {
        const labels = [...$options].map(opt => opt.textContent);
        expect(labels).to.include.members(optionLabels);
      });
    cy.get('body').type('{esc}');
    cy.wait(500);
  },

  checkPreviewOpen() {
    cy.xpath('//div[@class="titled-preview"]').should('be.visible');
    cy.xpath('//div[@data-testid="preview-fields"]').should('be.visible');
  },

  checkNoInstances() {
    cy.xpath('//div[@class="no-instances"]').should('be.visible');
  },

  checkPreviewSectionContains(section, value) {
    cy.xpath(
      `//div[@class="preview-block"]/strong[@class="sub-heading" and text()="${section}"]/following-sibling::div[normalize-space()="${value}"]`,
    ).should('exist');
  },

  checkPreviewSectionContainsLink(section, field, text, link) {
    cy.xpath(`//div[@class="preview-block" and strong[@class="sub-heading" and text()="${section}"]]`)
      .should('exist')
      .filter((_secIdx, sectionBlock) => {
        const $sectionBlock = Cypress.$(sectionBlock);
        const $fieldBlock = $sectionBlock
          .find('.value-heading')
          .filter((_fldIdx, el) => Cypress.$(el).text() === field);

        if (!$fieldBlock.length) {
          return false;
        }

        const $linkEl = $fieldBlock.next().find('.preview-value-link');

        return $linkEl.text() === text
          && $linkEl.attr('target') === 'blank'
          && $linkEl.attr('href') === link;
      })
      .should('have.length.at.least', 1);
  },

  checkPreviewSectionContainsField(section, field, value) {
    cy.xpath(
      `//div[@class="preview-block" and strong[@class="sub-heading" and text()="${section}"]]`,
    )
      .should('exist')
      .filter((_secIdx, sectionBlock) => {
        const $sectionBlock = Cypress.$(sectionBlock);
        const $fieldBlock = $sectionBlock
          .find('.value-heading')
          .filter((_fldIdx, el) => Cypress.$(el).text() === field);

        if (!$fieldBlock.length) {
          return false;
        }

        return $fieldBlock.next().text() === value;
      })
      .should('have.length.at.least', 1);
  },

  checkWorkPreviewLeftOfInstanceEditor() {
    cy.xpath('//div[@id="edit-section"]').then(($editor) => {
      cy.xpath('//div[contains(@class, "preview-container")]').then(($preview) => {
        const editorLeft = $editor[0].getBoundingClientRect().left;
        const previewRight = $preview[0].getBoundingClientRect().right;
        expect(previewRight).to.be.lte(editorLeft);
      });
    });
  },

  checkInstancePreviewRightOfWorkEditor() {
    cy.xpath('//div[@id="edit-section"]').then(($editor) => {
      cy.xpath('//div[contains(@class, "preview-container")]').then(($preview) => {
        const editorRight = $editor[0].getBoundingClientRect().right;
        const previewLeft = $preview[0].getBoundingClientRect().left;
        expect(editorRight).to.be.lte(previewLeft);
      });
    });
  },

  checkWorkActionsPlacement() {
    cy.xpath('//div[@id="edit-section"]').then(($editor) => {
      cy.xpath('//div[contains(@class, "preview-container")]').then(($preview) => {
        cy.xpath('//button[@data-testid="block-actions-toggle"]').then(($button) => {
          const editorRight = $editor[0].getBoundingClientRect().right;
          const previewLeft = $preview[0].getBoundingClientRect().left;
          const buttonRight = $button[0].getBoundingClientRect().right;
          expect(buttonRight).to.be.lte(editorRight);
          expect(buttonRight).to.be.lte(previewLeft);
        });
      });
    });
  },

  clickCancel() {
    cy.do(Button('Cancel').click());
    cy.wait(500);
  },

  clickCancelWithOption(option) {
    cy.do(Button('Cancel').click());
    cy.wait(1000);
    // modal is displayed
    closeResourceModal.verifyModalDisplayed();
    if (option.toLowerCase() === 'yes') {
      closeResourceModal.clickYesButton();
      cy.wait(1000);
    } else {
      closeResourceModal.clickNoButton();
      cy.wait(1000);
      closeResourceModal.verifyModalClosed();
    }
  },

  checkTextValueOnField(textValue, section) {
    cy.xpath(
      `(//div[text()="${section}"]/../..//input[@class="input edit-section-field-input" and @value="${textValue}"])[1]`,
    )
      .scrollIntoView()
      .should('be.visible');
  },

  checkTextValueOnDisabledField(textValue, section) {
    cy.xpath(
      `(//div[text()="${section}"]/../..//input[@class="input" and @value="${textValue}"])[1]`,
    )
      .scrollIntoView()
      .should('be.visible')
      .should('be.disabled');
  },

  checkDropdownTextValue(textValue, field) {
    cy.xpath(`//div[text()="${field}"]/../following-sibling::div//select[@data-testid="dropdown-field"]`)
      .filter((_selectIdx, selectBlock) => {
        const opt = selectBlock.options[selectBlock.selectedIndex];
        return opt && opt.text === textValue;
      })
      .should('have.length.at.least', 1);
  },

  checkSectionDropdownTextValue(textValue, field) {
    cy.xpath(`//div[text()="${field}"]/following-sibling::div//select[@data-testid="dropdown-field"]`)
      .filter((_selectIdx, selectBlock) => {
        const opt = selectBlock.options[selectBlock.selectedIndex];
        return opt && opt.text === textValue;
      })
      .should('have.length.at.least', 1);
  },

  checkLabelOnSectionSimpleField(textValue, section) {
    cy.xpath(
      `(//div[text()="${section}"]/following-sibling::div//div[contains(@class, "simple-lookup__multi-value__label") and text()="${textValue}"])[1]`,
    )
      .scrollIntoView()
      .should('be.visible');
  },

  checkLabelOnSimpleField(textValue, section) {
    cy.xpath(
      `(//div[text()="${section}"]/../following-sibling::div//div[contains(@class, "simple-lookup__multi-value__label") and text()="${textValue}"])[1]`,
    )
      .scrollIntoView()
      .should('be.visible');
  },

  checkHeadingProfile(profileName) {
    cy.xpath(`//h3[@class='heading' and contains(text(), '${profileName}')]`)
      .scrollIntoView()
      .should('be.visible');
  },

  clickCloseResourceButton() {
    cy.do(Button({ dataTestID: 'nav-close-button' }).click());
    cy.wait(500);
  },

  checkSaveButtonsDisabled() {
    cy.expect(saveAndCloseButton.has({ disabled: true }));
    cy.expect(saveKeepEditingButton.has({ disabled: true }));
  },

  checkSaveButtonsEnabled() {
    cy.expect(saveAndCloseButton.has({ disabled: false }));
    cy.expect(saveKeepEditingButton.has({ disabled: false }));
  },

  checkCloseAndCancelEnabled() {
    cy.expect(closeResourceButton.has({ disabled: false }));
    cy.expect(cancelButton.has({ disabled: false }));
  },

  checkEditWorkButtonEnabled() {
    cy.expect(editWorkButton.has({ disabled: false }));
  },

  checkNewInstanceButtonEnabled() {
    cy.expect(newInstanceButton.has({ disabled: false }));
  },

  checkNewInstanceButtonDisabled() {
    cy.expect(newInstanceButton.has({ disabled: true }));
  },

  checkInstanceActionsHidden() {
    cy.xpath(instanceActionsButton).should('not.exist');
  },

  setSectionFieldValue(value, section) {
    cy.wait(1000);
    cy.xpath(
      `//div[@class="label" and text()="${section}"]/following-sibling::div[@class="children-container"]/input`,
    )
      .focus()
      .type(`{selectall}${value}`);
    cy.wait(1000);
  },

  checkSectionFieldValue(value, section) {
    cy.xpath(
      `//div[@class="label" and text()="${section}"]/following-sibling::div[@class="children-container"]/input[@value="${value}"]`,
    )
      .scrollIntoView()
      .should('be.visible');
  },
};
