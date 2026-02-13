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
  SelectionOption,
  SelectionList,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const selectMembersButton = Button('Select members');
const collapseAllButton = Button('Collapse all');
const expandAllButton = Button('Expand all');
const managementPane = Pane('Management');
const expandPaneIcon = Button({ icon: 'caret-right' });
const collapsePaneIcon = Button({ icon: 'caret-left' });
const memberDropdownButton = Button({ id: 'consortium-member-select' });
const memberDropdownList = SelectionList({ id: 'sl-container-consortium-member-select' });

export const SHARED_SETTING_LIBRARIES = 'All';

export const messages = {
  created: (name, members) => {
    const libraryWord = (members.includes(',') || members === SHARED_SETTING_LIBRARIES) ? 'libraries' : 'library';
    return `${name} was successfully created for ${members} ${libraryWord}.`;
  },
  updated: (name, members) => {
    const libraryWord = (members.includes(',') || members === SHARED_SETTING_LIBRARIES) ? 'libraries' : 'library';
    return `${name} was successfully updated for ${members} ${libraryWord}.`;
  },
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
  dataExport: 'Data export',
  dataImport: 'Data import',
  inventory: 'Inventory',
  users: 'Users',
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

  verifySelectedMember(member) {
    cy.expect(memberDropdownButton.has({ singleValue: member }));
  },

  verifySelectMembersButton(isEnabled = true) {
    cy.expect(selectMembersButton.has({ disabled: !isEnabled }));
  },

  verifyButtonsState(isEnabled = true) {
    cy.expect(selectMembersButton.has({ disabled: !isEnabled }));
    cy.expect(Button('+ New').absent());
  },

  verifyPaneIncludesSettings(settingsList) {
    cy.get('#settings-nav-pane-content a').then(($elements) => {
      const availableSettings = [];
      cy.wrap($elements).each(($el) => {
        availableSettings.push($el.text());
      });
      if (settingsList) {
        settingsList.forEach((setting) => {
          cy.wrap(availableSettings).should('include', setting);
        });
        // cy.wrap(availableSettings).should('deep.equal', settingsList);
      } else {
        // if there is no settingsList then we check the alphabetical order
        cy.wrap(availableSettings).should('deep.equal', availableSettings.sort());
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

  verifyManagementPane() {
    this.verifySettingPaneIsDisplayed();
    this.verifyPaneIncludesSettings();

    cy.expect(managementPane.find(collapsePaneIcon).exists());
    const availableSettingsOptions = [];
    const availableLogsReportsOptions = [];
    cy.get('#settings-nav-pane [data-test-nav-list-section=true]').then((sections) => {
      cy.wrap(sections[0])
        .find('a')
        .then((options) => {
          cy.wrap(options).each(($el) => {
            availableSettingsOptions.push($el.text());
          });
        });
      cy.wrap(sections[1])
        .find('a')
        .then((options) => {
          cy.wrap(options).each(($el) => {
            availableLogsReportsOptions.push($el.text());
          });
        });
      cy.wrap(availableSettingsOptions).should(
        'deep.equal',
        Object.values(settingsItems)
          .filter((el) => !el.includes('Data'))
          .sort(),
      );
      cy.wrap(availableLogsReportsOptions).should(
        'deep.equal',
        Object.values(settingsItems)
          .filter((el) => el.includes('Data'))
          .sort(),
      );
    });
  },

  toggleManagementPane(expand = false) {
    if (expand) {
      cy.do(expandPaneIcon.click());
      this.verifyManagementPane();
    } else {
      cy.do(managementPane.find(collapsePaneIcon).click());
      cy.expect([managementPane.absent(), expandPaneIcon.exists()]);
    }
    this.waitLoading();
    this.verifySelectMembersButton();
  },

  verifyTenantsInDropdown: (memberNamesArray) => {
    cy.do(memberDropdownButton.click());
    cy.expect(memberDropdownList.has({ optionList: memberNamesArray.sort() }));
    cy.do(memberDropdownButton.click());
    cy.expect(SelectionOption().absent());
  },

  selectTenantFromDropdown: (memberName) => {
    cy.do([memberDropdownButton.click(), SelectionOption(memberName).click()]);
  },

  checkOptionInOpenedPane: (paneName, optionName, isShown = true) => {
    if (isShown) cy.expect(Pane(paneName).find(NavListItem(optionName)).exists());
    else cy.expect(Pane(paneName).find(NavListItem(optionName)).absent());
  },
};
