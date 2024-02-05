import {
  PaneHeader,
  Button,
  HTML,
  NavListItem,
  Pane,
  including,
  Spinner,
  Section,
  SelectionOption,
} from '../../../../interactors';

const selectMembersButton = Button('Select members');

export const settingsItems = {
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

  verifySetingPaneIsDisplayed() {
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
      const availableSettings = [];
      cy.wrap($elements).each(($el) => {
        availableSettings.push($el.text());
      });
      if (settingsList) {
        cy.wrap(availableSettings).should('deep.equal', settingsList);
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
    this.verifySetingPaneIsDisplayed();
    this.verifyPaneIncludesSettings();
    this.verifyMembersSelected(members);
    this.verifySelectMembersButton();
    this.verifyChooseSettingsIsDisplayed();
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
      Pane(nameOfThirdPane).find(Button('Collapse all')).click(),
      Button('Collapse all').absent(),
      Button('Expand all').exists(),
    ]);
  },

  expandAll(nameOfThirdPane) {
    cy.do([
      Pane(nameOfThirdPane).find(Button('Expand all')).click(),
      Button('Expand all').absent(),
      Button('Collapse all').exists(),
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

  selectMember(memberName) {
    cy.do([
      Button({ id: 'consortium-member-select' }).click(),
      SelectionOption(memberName).click(),
    ]);
    cy.wait(6000);
    cy.get('button#consortium-member-select')
      .invoke('text')
      .then((actualText) => {
        expect(actualText.trim()).to.equal(`Select control${memberName}`);
      });
  },
};
