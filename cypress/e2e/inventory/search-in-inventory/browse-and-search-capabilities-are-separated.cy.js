import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

const testData = {
  user: {},
};
const contributorsNameTypes = ['Personal name', 'Corporate name', 'Meeting name'];
const Dropdowns = {
  EFFECTIVE_LOCATION: 'Effective location (item)',
  NAME_TYPE: 'Name type',
  SUBJECT_SOURCE: 'Subject source',
  SUBJECT_TYPE: 'Subject type',
};
describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiCallNumberBrowse.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiSubjectBrowse.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        cy.waitForAuthRefresh().then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C368482 Browse and Search capabilities are separated\n (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C368482', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.switchToSearchTab();
        InventorySearchAndFilter.verifySearchAndFilterPane();
        InventoryInstances.verifyInstanceSearchOptions();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifySearchAndFilterPaneBrowseToggle();
        InventorySearchAndFilter.browseOptionsDropdownIncludesOptions(
          Object.values(BROWSE_CALL_NUMBER_OPTIONS),
        );

        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.EFFECTIVE_LOCATION, true);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.EFFECTIVE_LOCATION, false);

        InventorySearchAndFilter.selectBrowseOption('Contributors');
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.NAME_TYPE);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.NAME_TYPE, true);
        BrowseContributors.expandNameTypeMenu();
        BrowseContributors.verifyNameTypeOptions(contributorsNameTypes);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.NAME_TYPE);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.NAME_TYPE, false);
        InventorySearchAndFilter.selectBrowseOption('Subjects');
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SUBJECT_SOURCE, false);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SUBJECT_TYPE, false);
      },
    );
  });
});
