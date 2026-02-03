import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../support/utils/users';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const { user, memberTenant } = parseSanityParameters();

    before('navigate to inventory', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
        authRefresh: true,
      });
      cy.allure().logCommandSteps();
    });

    it(
      'C350377 Verify the "Browse subjects" search option on the Instances tab (spitfire)',
      { tags: ['dryRun', 'spitfire', 'C350377'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        InventorySearchAndFilter.selectBrowseSubjects();
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        InventoryActions.actionsIsAbsent();
        InventorySearchAndFilter.filtersIsAbsent();
        InventorySearchAndFilter.browseSubjectsSearch();
        cy.reload();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        InventorySearchAndFilter.filtersIsAbsent();
      },
    );
  });
});
