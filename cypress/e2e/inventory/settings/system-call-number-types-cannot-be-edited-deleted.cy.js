import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Settings', () => {
    const testData = {
      localCallNumberTypeName: `AT_C387447_LocalType_${getRandomPostfix()}`,
    };
    const updatedName = `${testData.localCallNumberTypeName}_Updated`;
    const saveCalloutTextCreate = `The Call number type ${testData.localCallNumberTypeName} was successfully created`;
    const saveCalloutTextUpdate = `The Call number type ${updatedName} was successfully updated`;
    const deleteCalloutText = `The Call number type ${updatedName} was successfully deleted`;
    let testUser;

    before('Create test data', () => {
      cy.getAdminToken();

      cy.createTempUser([Permissions.uiSettingsCallNumberTypesCreateEditDelete.gui]).then(
        (userProperties) => {
          testUser = userProperties;
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      CallNumberTypes.deleteCallNumberTypesLike(updatedName);
      Users.deleteViaApi(testUser.userId);
    });

    it(
      'C387447 System call number types cannot be edited/deleted in Settings (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C387447'] },
      () => {
        // Step 1: Click on "Settings" option in upper navigation menu
        cy.login(testUser.username, testUser.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.INVENTORY);
        SettingsPane.waitLoading();

        // Step 2: Click on "Inventory" option in first pane, Click on "Call number types" option in second pane
        CallNumberTypes.openCallNumberBrowse();
        CallNumberTypes.validateCallNumberTypesPaneOpened();

        // Verify that system call number types exist and have "system" source value
        CallNumberTypes.validateSystemCallNumberTypes();

        // Step 3: Click "+ New" button in third pane
        CallNumberTypes.clickNewButton();

        // Verify a new row is added with empty name field, "local" source, and disabled Save button
        CallNumberTypes.checkEmptyRowAdded();

        // Step 4: Fill added row's name input field and click "Save" button
        CallNumberTypes.fillNameInputField(testData.localCallNumberTypeName);
        CallNumberTypes.clickSaveButtonForItem(testData.localCallNumberTypeName);

        // Verify successful creation toast notification
        InteractorsTools.checkCalloutMessage(saveCalloutTextCreate);

        // Verify the new local call number type is shown with Edit and Delete icons
        CallNumberTypes.validateItemView(testData.localCallNumberTypeName);

        // Step 5: Click on "Edit" icon for added row
        CallNumberTypes.clickEditButtonForItem(testData.localCallNumberTypeName);
        CallNumberTypes.validateItemEdit(testData.localCallNumberTypeName);

        // Update value in "Name" input field and click "Save"
        CallNumberTypes.fillNameInputField(updatedName);
        CallNumberTypes.clickSaveButtonForItem(updatedName);

        // Verify successful update toast notification
        InteractorsTools.checkCalloutMessage(saveCalloutTextUpdate);

        // Verify the updated row is shown with Edit and Delete icons
        CallNumberTypes.validateItemView(updatedName);

        // Step 6: Click on "Delete" icon for added row
        CallNumberTypes.clickDeleteButtonForItem(updatedName);

        // Verify "Delete Call number type" modal appears
        CallNumberTypes.validateDeleteModal();

        // Step 7: Click "Delete" button in modal
        CallNumberTypes.clickDeleteButtonInModal();

        // Verify modal is closed and successful deletion toast notification is displayed
        CallNumberTypes.validateDeleteModal(false);
        InteractorsTools.checkCalloutMessage(deleteCalloutText);

        // Verify deleted row is not shown in third pane
        CallNumberTypes.checkItemShown(updatedName, false);

        // Verify system call number types still exist and do not have Edit/Delete icons
        CallNumberTypes.validateSystemCallNumberTypes();
      },
    );
  });
});
