import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  const user = {};
  const query = 'AT_C387486_BrowseQuery';
  const contributorsOption = 'Contributors';
  const subjectsOption = 'Subjects';

  describe('Call Number Browse', () => {
    before('Creating user', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        user.userProperties = createdUserProperties;
        cy.login(user.userProperties.username, user.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseCallNumbers();
      });
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userProperties.userId);
    });

    it(
      'C387486 Retain entered search query in "Inventory >> Browse" during browse options switching (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C387486', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.fillInBrowseSearch(query);
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(query);
        InventorySearchAndFilter.checkSearchButtonEnabled();

        Object.values(BROWSE_CALL_NUMBER_OPTIONS)
          .slice(0, 4)
          .forEach((browseOption) => {
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(browseOption);
            InventorySearchAndFilter.checkBrowseOptionSelected(browseOption);
            InventorySearchAndFilter.checkBrowseSearchInputFieldContent(query);
            InventorySearchAndFilter.checkSearchButtonEnabled();
          });
        [contributorsOption, subjectsOption].forEach((browseOption) => {
          InventorySearchAndFilter.selectBrowseOption(browseOption);
          InventorySearchAndFilter.checkBrowseOptionSelected(browseOption);
          InventorySearchAndFilter.checkBrowseSearchInputFieldContent(query);
          InventorySearchAndFilter.checkSearchButtonEnabled();
        });

        InventorySearchAndFilter.clickSearch();
        BrowseSubjects.checkSearchResultsTable();

        InventorySearchAndFilter.selectBrowseOption(contributorsOption);
        InventorySearchAndFilter.checkBrowseOptionSelected(contributorsOption);
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(query);
        BrowseSubjects.checkSearchResultsTable();
        InventorySearchAndFilter.checkSearchButtonEnabled();

        [
          ...Object.values(BROWSE_CALL_NUMBER_OPTIONS).slice(0, 4),
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        ].forEach((browseOption, index) => {
          InventorySearchAndFilter.clickSearch();
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(browseOption);
          InventorySearchAndFilter.checkBrowseOptionSelected(browseOption);
          InventorySearchAndFilter.checkBrowseSearchInputFieldContent(query);
          if (!index) BrowseContributors.checkSearchResultsTable();
          else BrowseCallNumber.checkSearchResultsTable();
          InventorySearchAndFilter.checkSearchButtonEnabled();
        });

        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
        );
        InventorySearchAndFilter.checkBrowseOptionSelected(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
        );
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');
        InventorySearchAndFilter.verifyResetAllButtonDisabled(true);
        InventorySearchAndFilter.verifySearchButtonDisabled();
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
      },
    );
  });
});
