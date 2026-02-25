import { INVENTORY_COLUMN_HEADERS } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('Result list', () => {
    describe('Column Chooser', () => {
      const instanceTitlePrefix = `AT_C196760_FolioInstance_${getRandomPostfix()}`;
      const folioInstances = InventoryInstances.generateFolioInstances({
        instanceTitlePrefix,
        count: 2,
        holdingsCount: 0,
      });
      const allColumnsExcept = (hiddenColumns) => {
        const hidden = Array.isArray(hiddenColumns) ? hiddenColumns : [hiddenColumns];
        return Object.values(INVENTORY_COLUMN_HEADERS).filter((column) => !hidden.includes(column));
      };
      let user;

      beforeEach('Create test data and login', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          user = userProperties;

          InventoryInstances.createFolioInstancesViaApi({
            folioInstances,
          });

          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      afterEach('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(folioInstances[0].instanceId);
        InventoryInstance.deleteInstanceViaApi(folioInstances[1].instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C196760 Results List Column Chooser (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C196760'] },
        () => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(instanceTitlePrefix);
          InventorySearchAndFilter.validateSearchTableColumnsShown();

          InventoryInstances.clickActionsButton();
          InventorySearchAndFilter.verifyShowColumnsMenu();
          InventorySearchAndFilter.verifyShowColumnsCheckboxesChecked();

          InventorySearchAndFilter.toggleShowColumnCheckbox(
            INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            allColumnsExcept(INVENTORY_COLUMN_HEADERS.CONTRIBUTORS),
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
            false,
          );

          InventorySearchAndFilter.toggleShowColumnCheckbox(INVENTORY_COLUMN_HEADERS.DATE, false);
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            allColumnsExcept([
              INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
              INVENTORY_COLUMN_HEADERS.DATE,
            ]),
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.DATE,
            false,
          );

          InventorySearchAndFilter.toggleShowColumnCheckbox(
            INVENTORY_COLUMN_HEADERS.PUBLISHERS,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            allColumnsExcept([
              INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
              INVENTORY_COLUMN_HEADERS.DATE,
              INVENTORY_COLUMN_HEADERS.PUBLISHERS,
            ]),
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.DATE,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.PUBLISHERS,
            false,
          );

          InventorySearchAndFilter.toggleShowColumnCheckbox(
            INVENTORY_COLUMN_HEADERS.RELATION,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            allColumnsExcept([
              INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
              INVENTORY_COLUMN_HEADERS.DATE,
              INVENTORY_COLUMN_HEADERS.PUBLISHERS,
              INVENTORY_COLUMN_HEADERS.RELATION,
            ]),
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.DATE,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.PUBLISHERS,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.RELATION,
            false,
          );

          InventorySearchAndFilter.toggleShowColumnCheckbox(
            INVENTORY_COLUMN_HEADERS.INSTANCE_HRID,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            allColumnsExcept([
              INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
              INVENTORY_COLUMN_HEADERS.DATE,
              INVENTORY_COLUMN_HEADERS.PUBLISHERS,
              INVENTORY_COLUMN_HEADERS.RELATION,
              INVENTORY_COLUMN_HEADERS.INSTANCE_HRID,
            ]),
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.DATE,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.PUBLISHERS,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.RELATION,
            false,
          );
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            INVENTORY_COLUMN_HEADERS.INSTANCE_HRID,
            false,
          );

          Object.values(INVENTORY_COLUMN_HEADERS)
            .slice(1)
            .forEach((columnName) => {
              InventorySearchAndFilter.toggleShowColumnCheckbox(columnName);
            });
          InventorySearchAndFilter.validateSearchTableColumnsShown();

          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          InventoryInstances.searchByTitle(instanceTitlePrefix);
          InventorySearchAndFilter.validateSearchTableColumnsShown();

          InventoryInstances.clickActionsButton();
          InventorySearchAndFilter.verifyShowColumnsMenu();
          InventorySearchAndFilter.verifyShowColumnsCheckboxesChecked();

          Object.values(INVENTORY_COLUMN_HEADERS)
            .slice(1)
            .forEach((columnName) => {
              InventorySearchAndFilter.toggleShowColumnCheckbox(columnName, false);
            });
          InventorySearchAndFilter.validateSearchTableColumnsShown(INVENTORY_COLUMN_HEADERS.TITLE);
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            allColumnsExcept(INVENTORY_COLUMN_HEADERS.TITLE),
            false,
          );

          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          InventoryInstances.searchByTitle(instanceTitlePrefix);
          InventorySearchAndFilter.validateSearchTableColumnsShown(INVENTORY_COLUMN_HEADERS.TITLE);
          InventorySearchAndFilter.validateSearchTableColumnsShown(
            allColumnsExcept(INVENTORY_COLUMN_HEADERS.TITLE),
            false,
          );

          InventoryInstances.clickActionsButton();
          InventorySearchAndFilter.verifyShowColumnsMenu();
          Object.values(INVENTORY_COLUMN_HEADERS)
            .slice(1)
            .forEach((columnName) => {
              InventorySearchAndFilter.toggleShowColumnCheckbox(columnName);
            });
          InventorySearchAndFilter.validateSearchTableColumnsShown();
        },
      );
    });
  });
});
