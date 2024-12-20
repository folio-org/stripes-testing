import {
  PaneHeader,
  Button,
  HTML,
  NavListItem,
  Pane,
  including,
  Spinner,
  Section,
  calloutTypes,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const selectMembersButton = Button('Select members');
const collapseAllButton = Button('Collapse all');
const expandAllButton = Button('Expand all');

export const messages = {
  created: (name, members) => `${name} was successfully created for ${members} libraries.`,
  updated: (name, members) => `${name} was successfully updated for ${members} libraries.`,
  deleted: (settingName, entityName) => `The ${settingName} ${entityName} was successfully deleted`,
  noPermission: (members) => `You do not have permissions at one or more members: ${members}`,
  pleaseFillIn: 'Please fill this in to continue',
  codeRequired: 'Code is required',
  notUnique: (fieldName) => `${fieldName} is already in use at one or more member libraries.`,
};

export const settingsItems = {
  authorizationPolicies: 'Authorization policies',
  authorizationRoles: 'Authorization roles',
  circulation: 'Circulation',
  inventory: 'Inventory',
  users: 'Users',
  dataExport: 'Data export',
  dataImport: 'Data import',
};

export default {
  waitLoading() {
    cy.expect(
      PaneHeader({
        title: 'Settings for selected members can be modified at the same time',
      }).exists(),
    );
  },

  verifySettingPaneIsDisplayed() {
    cy.expect(Section({ id: 'settings-nav-pane' }).exists());
  },

  verifyChooseSettingsIsDisplayed() {
    cy.expect(HTML({ text: 'Choose settings' }).exists());
  },

  verifyMembersSelected(count) {
    cy.expect(
      HTML(
        including(
          `${
            count === undefined ? '' : count === 1 ? `${count} member` : `${count} members`
          } selected`,
        ),
      ).exists(),
    );
  },

  verifySelectMembersButton() {
    cy.expect(selectMembersButton.exists());
  },

  verifyPaneIncludesSettings(settingsList) {
    cy.get('#settings-nav-pane-content a').then(($elements) => {
      const availableSettings = [...$elements].map(($el) => $el.innerText.trim());
      if (settingsList) {
        if (JSON.stringify(availableSettings) !== JSON.stringify(settingsList)) {
          throw new Error(
            `Settings do not match:\nExpected: ${settingsList.join(', ')}\nActual: ${availableSettings.join(', ')}`,
          );
        }
      } else {
        // do nothing
      }
    });
  },

  verifySelectedSettingIsDisplayed(settingName) {
    cy.expect(Pane(settingName).exists());
  },

  chooseSettingsItem(settingName) {
    cy.do(Section({ id: 'settings-nav-pane' }).find(NavListItem(settingName)).click());
    this.verifySelectedSettingIsDisplayed(settingName);
  },

  verifyStatusOfConsortiumManager(members) {
    this.waitLoading();
    this.verifySettingPaneIsDisplayed();
    this.verifyPaneIncludesSettings();
    this.verifyMembersSelected(members);
    this.verifySelectMembersButton();
  },

  clickSelectMembers() {
    cy.expect(Spinner().absent());
    cy.do(selectMembersButton.click());
    cy.wait(4000);
  },

  chooseSecondMenuItem(item) {
    cy.expect(Spinner().absent());
    cy.do([
      NavListItem(item).click(),
      Pane(item).exists(),
      HTML(including(item, { class: 'headline' })).exists(),
    ]);
  },

  openListInSettings(settingsListName) {
    cy.do([
      Section({ id: 'settings-nav-pane' }).find(NavListItem(settingsListName)).click(),
      Pane(settingsListName).exists(),
    ]);
  },

  openListInOpenedPane(settingsListName, nameOfThirdPane) {
    cy.do([
      Pane(settingsListName).find(NavListItem(nameOfThirdPane)).click(),
      Pane(nameOfThirdPane).exists(),
    ]);
  },

  collapseAll(nameOfThirdPane) {
    cy.do([
      Pane(nameOfThirdPane).find(collapseAllButton).click(),
      collapseAllButton.absent(),
      expandAllButton.exists(),
    ]);
  },

  expandAll(nameOfThirdPane) {
    cy.do([
      Pane(nameOfThirdPane).find(expandAllButton).click(),
      expandAllButton.absent(),
      collapseAllButton.exists(),
    ]);
  },

  closeThirdPane(nameOfThirdPane) {
    cy.do([
      Pane(nameOfThirdPane)
        .find(Button({ icon: 'times' }))
        .click(),
      Pane(nameOfThirdPane).absent(),
    ]);
  },

  clickActionsInPermissionSets() {
    cy.do([Pane('Permission sets').find(Button('Actions')).click(), Button('Compare').exists()]);
  },

  verifyListIsEmpty() {
    cy.expect(HTML(including('The list contains no items')).exists());
  },

  checkMessage(message, calloutType = calloutTypes.success) {
    InteractorsTools.checkCalloutMessage(including(message), calloutType);
    InteractorsTools.closeCalloutMessage();
  },
};
