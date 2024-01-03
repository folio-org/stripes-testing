import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Lists -› Filter lists', () => {
  const userData = {};
  const testData = {
    checkboxesToSelect: ['Inactive', 'Shared', 'Users'],
    accordionsWithSelectedCheckboxes: ['status', 'visibility', 'recordTypes'],
  };

  const defaultSettings = {
    selectedCheckboxes: ['Active'],
    notSelectedCheckboxes: ['Inactive', 'Shared', 'Private', 'Loans', 'Users', 'Items'],
    accordionsWithXIcon: ['status'],
    accordionsWithoutXIcon: ['visibility', 'recordTypes'],
  };

  before('Create a user', () => {
    cy.getAdminToken();
    cy.createTempUser([Permissions.listsAll.gui]).then((userProperties) => {
      userData.username = userProperties.username;
      userData.password = userProperties.password;
      userData.userId = userProperties.userId;
    });
  });

  after('Delete a user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C411807 Verify that after clicking on "Reset all" button, all filters resets (corsair) (TaaS)',
    { tags: ['criticalPath', 'corsair'] },
    () => {
      // 1
      cy.login(userData.username, userData.password);
      cy.visit(TopMenu.listsPath);
      Lists.waitLoading();
      // 2
      Lists.verifyCheckBoxIsSelected(defaultSettings.selectedCheckboxes);
      Lists.verifyResetAllIsDisabled();
      Lists.verifyCheckBoxIsSelected(defaultSettings.notSelectedCheckboxes, false);
      Lists.verifyResetAllAccordeonsExists();
      // 3
      Lists.selectCheckbox(defaultSettings.selectedCheckboxes);
      Lists.verifyCheckBoxIsSelected(defaultSettings.selectedCheckboxes, false);
      Lists.verifyResetAllIsDisabled(false);
      // 4
      Lists.resetAll();
      Lists.verifyCheckBoxIsSelected(defaultSettings.selectedCheckboxes);
      Lists.verifyAccordionHasXIcon(defaultSettings.accordionsWithXIcon);
      Lists.verifyResultsListExists();
      // 5
      Lists.selectCheckbox(testData.checkboxesToSelect);
      Lists.verifyAccordionHasXIcon(testData.accordionsWithSelectedCheckboxes);
      Lists.verifyResetAllIsDisabled(false);
      Lists.verifyResultsListExists(false);
      // 6
      Lists.resetAll();
      Lists.verifyResetAllIsDisabled();
      Lists.verifyCheckBoxIsSelected(defaultSettings.selectedCheckboxes);
      Lists.verifyCheckBoxIsSelected(defaultSettings.notSelectedCheckboxes, false);
      Lists.verifyAccordionHasXIcon(defaultSettings.accordionsWithoutXIcon, false);
      Lists.verifyResultsListExists();
    },
  );
});
