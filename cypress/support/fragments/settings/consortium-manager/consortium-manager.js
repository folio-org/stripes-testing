import {
  Button,
  Dropdown,
  HTML,
  Modal,
  NavListItem,
  Section,
  SelectionOption,
  Selection,
  TextField,
  including,
} from '../../../../../interactors';
import OrderStorageSettings from '../../orders/orderStorageSettings';

const myProfileButton = Dropdown({ id: 'profileDropdown' }).find(
  Button({ className: including('navButton') }),
);
const switchActiveAffiliationButton = Button('Switch active affiliation');
const CENTRAL_ORDERING_SETTINGS_KEY = 'ALLOW_ORDERING_WITH_AFFILIATED_LOCATIONS';
const selectAffiliationModal = Modal('Select affiliation');
const selectAffiliationButtonInModal = Button({ id: 'consortium-affiliations-select' });
const affiliationSelect = Selection({ id: 'consortium-affiliations-select' });
const saveAffiliationButton = Button({ id: 'save-active-affiliation' });
const cancelAffiliationButton = selectAffiliationModal.find(Button('Cancel'));

export default {
  waitLoading() {
    cy.expect(Section({ id: 'app-settings-nav-pane' }).exists());
  },
  waitLoadingForAddresses() {
    cy.expect(Section({ id: 'app-settings-nav-pane' }).exists());
  },

  verifyConsortiumManagerOnPage() {
    cy.expect(
      Section({ id: 'settings-nav-pane' }).find(NavListItem('Consortium manager')).exists(),
    );
  },

  verifyConsortiumManagerIsAbsent() {
    cy.expect(
      Section({ id: 'settings-nav-pane' }).find(NavListItem('Consortium manager')).absent(),
    );
  },

  selectMembership() {
    cy.do(NavListItem('Membership').click());
  },

  editTenant(name) {
    cy.contains('div[class*="mclCell-"]', name)
      .parent('div[class*="mclRow-"]')
      .find('button[icon="edit"]')
      .click();
  },

  editTenantInformation(codeText, nameText) {
    cy.do([
      TextField({ placeholder: 'code' }).fillIn(codeText),
      TextField({ placeholder: 'name' }).fillIn(nameText),
    ]);
  },

  saveEditingTenantInformation() {
    cy.do(Button('Save').click());
  },

  cancelEditingTenantInformation() {
    cy.do(Button('Cancel').click());
  },

  checkErrorsInEditedTenantInformation(codeText, nameText) {
    cy.expect([
      TextField({ placeholder: 'code' }).has({ error: codeText }),
      TextField({ placeholder: 'name' }).has({ error: nameText }),
    ]);
  },

  checkSelectAffiliationModalIsDisplayed({ isShown = true } = {}) {
    cy.wait(2000);
    if (isShown) cy.expect(selectAffiliationModal.exists());
    else cy.expect(selectAffiliationModal.absent());
  },

  openSelectAffiliationModal() {
    cy.wait(5000);
    cy.do([myProfileButton.click(), switchActiveAffiliationButton.click()]);
    this.checkSelectAffiliationModalIsDisplayed();
  },

  selectAffiliationInModal(newTenantName) {
    cy.do([
      selectAffiliationModal.find(selectAffiliationButtonInModal).click(),
      SelectionOption(including(newTenantName)).click(),
    ]);
    cy.expect(SelectionOption(including(newTenantName)).absent());
    cy.expect(affiliationSelect.has({ singleValue: newTenantName }));
    cy.wait(2000);
  },

  clickSaveInSelectAffiliationModal() {
    cy.do(saveAffiliationButton.click());
    this.checkSelectAffiliationModalIsDisplayed({ isShown: false });
    cy.wait(8000);
  },

  clickCancelInSelectAffiliationModal() {
    cy.do(cancelAffiliationButton.click());
    this.checkSelectAffiliationModalIsDisplayed({ isShown: false });
  },

  switchActiveAffiliation(currentTenantName, newTenantName) {
    this.checkCurrentTenantInTopMenu(currentTenantName);
    this.openSelectAffiliationModal();
    this.selectAffiliationInModal(newTenantName);
    this.clickSaveInSelectAffiliationModal();
    this.checkCurrentTenantInTopMenu(newTenantName);
    cy.wait(4000);
  },

  switchActiveAffiliationIsAbsent() {
    cy.wait(5000);
    cy.do(myProfileButton.click());
    cy.expect(switchActiveAffiliationButton.absent());
    cy.do(myProfileButton.click());
  },

  switchActiveAffiliationExists() {
    cy.wait(5000);
    cy.do(myProfileButton.click());
    cy.expect(switchActiveAffiliationButton.exists());
    cy.do(myProfileButton.click());
  },

  checkCurrentTenantInTopMenu(tenantName) {
    cy.expect(
      Dropdown({ id: 'profileDropdown' })
        .find(HTML({ text: tenantName }))
        .exists(),
    );
  },

  editTenantName(oldName, newName) {
    cy.xpath(`//input[@value = '${oldName}']`).clear().type(newName);
  },

  saveEditingTenantChangesClickActiveButton() {
    cy.xpath("//button[contains(@id, 'save-consortia')]").should('not.be.disabled').click();
  },

  checkEditedTenantName(name) {
    cy.xpath(`//div[contains(text(), '${name}')]`).should('be.visible');
  },

  checkOptionsExist() {
    cy.expect(NavListItem('Membership').exists());
    cy.expect(NavListItem('Central ordering').exists());
  },

  getCentralOrderingSettingsViaApi() {
    return OrderStorageSettings.getSettingsViaApi({ key: CENTRAL_ORDERING_SETTINGS_KEY });
  },

  updateCentralOrderingSettingsViaApi(settings) {
    return OrderStorageSettings.updateSettingViaApi(settings);
  },

  createCentralOrderingSettingsViaApi(setting) {
    return OrderStorageSettings.createSettingViaApi(setting);
  },

  enableCentralOrderingViaApi() {
    const enabledCentralOrdering = 'true';
    return this.getCentralOrderingSettingsViaApi().then((settings) => {
      if (settings?.length !== 0 && settings.value !== enabledCentralOrdering) {
        return this.updateCentralOrderingSettingsViaApi({
          ...settings[0],
          value: enabledCentralOrdering,
        });
      }
      if (settings?.length === 0) {
        return this.createCentralOrderingSettingsViaApi({
          key: CENTRAL_ORDERING_SETTINGS_KEY,
          value: enabledCentralOrdering,
        });
      }
      return settings[0];
    });
  },
};
