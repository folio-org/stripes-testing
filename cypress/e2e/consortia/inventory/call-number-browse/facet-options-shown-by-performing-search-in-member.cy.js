import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {
      contributor: 'Contributors',
      value: 'a',
      subject: 'Subjects',
    };

    const Dropdowns = {
      EFFECTIVE_LOCATION: 'Effective location (item)',
      NAME_TYPE: 'Name type',
      SHARED: 'Shared',
    };

    const users = {};

    before('Create users, data', () => {
      cy.getAdminToken();

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
        .then((userProperties) => {
          users.userProperties = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(users.userProperties.userId, [
            Permissions.uiInventoryViewInstances.gui,
          ]);
        })
        .then(() => {
          cy.resetTenant();
          cy.waitForAuthRefresh(() => {
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
            InventoryInstances.waitContentLoading();
          }, 20_000);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();
        });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(users.userProperties.userId);
    });

    it(
      'C784490 Facet options shown after clicking "Reset all" in Browse and performing search in Member tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire', 'C784490'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyBrowseOptions();
        InventorySearchAndFilter.selectBrowseOption(testData.contributor);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.NAME_TYPE);
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkBrowseQueryText('');
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.selectBrowseOption(testData.contributor);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.NAME_TYPE);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SHARED, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, 'Yes');
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.NAME_TYPE);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.NAME_TYPE, true);
        InventorySearchAndFilter.checkMultiSelectOptionsWithCountersExistInAccordion(
          Dropdowns.NAME_TYPE,
        );

        InventorySearchAndFilter.selectBrowseOption(testData.subject);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkBrowseQueryText('');
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.selectBrowseOption(testData.subject);
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SHARED, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, 'Yes');

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkBrowseQueryText('');
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SHARED, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, 'Yes');
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.EFFECTIVE_LOCATION, true);
        InventorySearchAndFilter.verifyTextFieldInAccordion(Dropdowns.EFFECTIVE_LOCATION, '');

        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.clickResetAllButton();
        BrowseContributors.checkBrowseQueryText('');
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.browseSearch(testData.value);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionExistance(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.SHARED);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.SHARED, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(Dropdowns.SHARED, 'Yes');
        InventorySearchAndFilter.clickAccordionByName(Dropdowns.EFFECTIVE_LOCATION);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(Dropdowns.EFFECTIVE_LOCATION, true);
        InventorySearchAndFilter.verifyTextFieldInAccordion(Dropdowns.EFFECTIVE_LOCATION, '');
      },
    );
  });
});
