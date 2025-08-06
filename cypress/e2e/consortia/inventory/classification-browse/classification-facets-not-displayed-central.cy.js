import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import { BROWSE_CLASSIFICATION_OPTIONS } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    describe('Consortia', () => {
      let user;

      before('Create user and login', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C468271 Check what facets are displayed in the browse Classifications pane on Central tenant (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C468271'] },
        () => {
          // Navigate to Browse tab
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyCallNumberBrowsePane();
          // Check browse options
          InventorySearchAndFilter.verifyBrowseOptions();

          // Step 2: Select "Classification (all)" browse option
          InventorySearchAndFilter.selectBrowseOption(
            BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.checkBrowseOptionSelected(
            BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
          );
          // Verify there are no facets displayed under Search & filter pane
          InventorySearchAndFilter.verifyBrowseFacetsNotDisplayed();

          // Step 3: Select "Dewey Decimal classification" browse option
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
          );
          InventorySearchAndFilter.checkBrowseOptionSelected(
            BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
          );
          // Verify there are no facets displayed under Search & filter pane
          InventorySearchAndFilter.verifyBrowseFacetsNotDisplayed();

          // Step 4: Select "Library of Congress classification" browse option
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            BROWSE_CLASSIFICATION_OPTIONS.LIBRARY_OF_CONGRESS,
          );
          InventorySearchAndFilter.checkBrowseOptionSelected(
            BROWSE_CLASSIFICATION_OPTIONS.LIBRARY_OF_CONGRESS,
          );
          // Verify there are no facets displayed under Search & filter pane
          InventorySearchAndFilter.verifyBrowseFacetsNotDisplayed();
        },
      );
    });
  });
});
