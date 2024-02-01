import {
  PaneHeader,
  Button,
  HTML,
  NavListItem,
  Pane,
  including,
  Spinner,
  Section,
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
  },

  chooseSecondMenuItem(item) {
    cy.expect(Spinner().absent());
    cy.do([
      NavListItem(item).click(),
      Pane(item).exists(),
      HTML(including(item, { class: 'headline' })).exists(),
    ]);
  },
};
