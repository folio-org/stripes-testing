import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const staffSuppressAccordionName = 'Staff suppress';
      const sourceAccordionName = 'Source';
      let userC446060;
      let userC451536;

      before('Create users', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
          userC446060 = userProperties;
        });
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          userC451536 = userProperties;
        });
      });

      after('Delete users', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userC446060.userId);
        Users.deleteViaApi(userC451536.userId);
      });

      it(
        'C446060 User without "Inventory: Enable staff suppress facet" permission is not able to see the "Staff suppress" facet (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C446060'] },
        () => {
          cy.waitForAuthRefresh(() => {
            cy.login(userC446060.username, userC446060.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
          InventorySearchAndFilter.instanceTabIsDefault();
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyAccordionExistance(sourceAccordionName);
          InventorySearchAndFilter.verifyAccordionExistance(staffSuppressAccordionName, false);
        },
      );

      it(
        'C451536 User with "Inventory: All permissions" permission is not able to see the "Staff suppress" facet (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C451536'] },
        () => {
          cy.waitForAuthRefresh(() => {
            cy.login(userC451536.username, userC451536.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
          InventorySearchAndFilter.instanceTabIsDefault();
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyAccordionExistance(sourceAccordionName);
          InventorySearchAndFilter.verifyAccordionExistance(staffSuppressAccordionName, false);
        },
      );
    });
  });
});
