import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {
      contributor: 'Contributors',
      subject: 'Subjects',
      value: 'a',
    };

    const Dropdowns = {
      EFFECTIVE_LOCATION: 'Effective location (item)',
      NAME_TYPE: 'Name type',
      SHARED: 'Shared',
      HELD_BY: 'Held by',
    };

    const users = {};

    before('Create users, data', () => {
      cy.getAdminToken();

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
        .then((userProperties) => {
          users.userProperties = userProperties;
        })
        .then(() => {
          cy.resetTenant();
          cy.login(users.userProperties.username, users.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(users.userProperties.userId);
    });

    it(
      'C721677 Facet options shown after clicking "Reset all" in Browse and performing search in Central tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyBrowseOptions();
        InventorySearchAndFilter.selectBrowseOption(testData.contributor);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.NAME_TYPE);
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkBrowseQueryText('');
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.selectBrowseOption(testData.contributor);
        InventorySearchAndFilter.browseSearch(testData.value);
        cy.wait(1000);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.NAME_TYPE);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.NAME_TYPE);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.NAME_TYPE, true);
        InventorySearchAndFilter.verifyNameTypeOption('Personal name');

        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.HELD_BY);
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkBrowseQueryText('');
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.HELD_BY);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.HELD_BY);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.HELD_BY, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.HELD_BY, 'University');

        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.HELD_BY);
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkBrowseQueryText('');
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.HELD_BY);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.HELD_BY);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.HELD_BY, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.HELD_BY, 'University');
      },
    );
  });
});
