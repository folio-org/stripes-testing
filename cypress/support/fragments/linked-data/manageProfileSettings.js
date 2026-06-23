import { Button } from '../../../../interactors';

const manageProfileSettingsContainer = '[data-testid="manage-profile-settings"]';
const closeButton = Button({ dataTestID: 'nav-close-button' });
const defaultProfileSettingsRadio = '[data-testid="settings-active-default"]';
const customProfileSettingsRadio = '[data-testid="settings-active-custom"]';
const unusedComponentList = '[data-testid="unused-component-list"]';
const selectedComponentList = '[data-testid="selected-component-list"]';
const preferredProfileCheckbox = '[data-testid="type-default-setting"]';
const saveAndCloseButton = Button({ dataTestID: 'save-and-close' });
const saveAndKeepEditingButton = Button({ dataTestID: 'save-and-keep-editing' });
const modalSubmitButton = Button({ dataTestID: 'modal-button-submit' });
const modalCancelButton = Button({ dataTestID: 'modal-button-cancel' });
const manageProfileSettingsOption = Button({
  dataTestID: 'resources-actions-dropdown__option-ld.manageProfileSettings',
});

export const PROFILE_COMPONENT_IDS = {
  INSTANCE_EDITION_STATEMENT: 'component-Profile:Instance:EditionStatement',
  INSTANCE_PROVISION_ACTIVITY: 'component-Profile:Instance:ProvisionActivity',
  WORK_ILLUSTRATIVE_CONTENT: 'component-Profile:Work:IllustrativeContent',
  WORK_GOVERNMENT_PUBLICATION: 'component-Profile:Work:GovernmentPublication',
  HUB_TITLE_INFORMATION: 'component-Profile:Hub:TitleInformation',
  HUB_CREATOR_OF_HUB: 'component-Profile:Hub:CreatorOfHub',
};

export default {
  waitLoading() {
    cy.get(manageProfileSettingsContainer).should('be.visible');
  },

  open() {
    cy.do(manageProfileSettingsOption.click());
    this.waitLoading();
  },

  close() {
    cy.do(closeButton.click());
  },

  selectProfile(profileName) {
    cy.do(Button({ dataTestID: 'resource-profile-item', text: profileName }).click());
    cy.wait(4000);
  },

  checkDefaultCheckboxChecked() {
    cy.get(preferredProfileCheckbox).should('be.checked');
  },

  checkDefaultCheckboxNotChecked() {
    cy.get(preferredProfileCheckbox).should('not.be.checked');
  },

  setAsDefault(profileName) {
    cy.get('.profile.selected [data-testid="resource-profile-item"]').should(
      'have.text',
      profileName,
    );
    cy.get(preferredProfileCheckbox).click();
    cy.wait(500);
  },

  verifyCustomRadioSelected() {
    cy.get(customProfileSettingsRadio).should('be.checked');
  },

  verifyProfileDefaultRadioSelected() {
    cy.get(defaultProfileSettingsRadio).should('be.checked');
  },

  moveComponentToUnused(componentTestId) {
    cy.get(`[data-testid="${componentTestId}"] [data-testid="activate-menu"]`)
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });
    cy.wait(1000);
    cy.get('[data-testid="move-action"]').should('be.visible').click();
    cy.wait(500);
  },

  verifyComponentInUnused(componentTestId) {
    cy.get(unusedComponentList).find(`[data-testid="${componentTestId}"]`).should('exist');
  },

  verifyComponentInSelected(componentTestId) {
    cy.get(selectedComponentList).find(`[data-testid="${componentTestId}"]`).should('exist');
  },

  verifyUnusedComponentsCount(count) {
    cy.get(unusedComponentList).should('contain.text', `Unused components(${count})`);
  },

  verifySelectedComponentsCount(count) {
    cy.get(selectedComponentList).should('contain.text', `Selected components(${count})`);
  },

  reorderComponentToFirstPosition(componentTestId) {
    cy.get(
      `${selectedComponentList} [data-testid="${componentTestId}"] [data-testid="nudge-up"]`,
    ).click({ force: true });
  },

  verifyComponentAtPosition(componentTestId, componentTitle, position) {
    cy.get(selectedComponentList)
      .find(`[data-testid="${componentTestId}"]`)
      .should('contain.text', `${position}. ${componentTitle}`);
  },

  saveAndKeepEditing() {
    cy.expect(saveAndKeepEditingButton.is({ disabled: false }));
    cy.do(saveAndKeepEditingButton.click());
    cy.wait(1500);
  },

  saveAndClose() {
    cy.expect(saveAndCloseButton.is({ disabled: false }));
    cy.do(saveAndCloseButton.click());
    cy.wait(1500);
  },

  clickSaveOnModal() {
    cy.do(modalSubmitButton.click());
    cy.wait(3000);
  },

  clickContinueWithoutSavingOnModal() {
    cy.do(modalCancelButton.click());
    cy.wait(500);
  },

  verifyProfileComponentsDeselectedModalVisible() {
    cy.contains('Profile components deselected').should('be.visible');
  },
  verifyProfileComponentsDeselectedModalNotVisible() {
    cy.contains('Profile components deselected').should('not.exist');
  },

  verifyUnsavedChangesModalVisible() {
    cy.contains('Unsaved profile changes').should('be.visible');
  },
};
