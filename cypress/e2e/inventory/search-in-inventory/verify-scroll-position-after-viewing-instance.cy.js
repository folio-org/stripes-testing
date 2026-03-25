import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Result list', () => {
    let user;

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C927743 Verify Inventory hit list maintains scroll position after viewing and closing an Instance record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C927743'] },
      () => {
        const verifyScrollPositionSteps = () => {
          InventoryInstances.getResultsCount().then((count) => {
            const middleIndex = Math.floor(count / 2);
            const bottomIndex = count - 2;
            const previousBottomIndex = count - 3;

            // Steps 2-5: Scroll to middle, open instance, close detail pane (twice)
            for (let i = 0; i < 2; i++) {
              InventoryInstances.scrollToRow(middleIndex);
              InventoryInstances.selectInstance(middleIndex);
              InventoryInstances.verifyRowIsHighlighted(middleIndex);
              InventorySearchAndFilter.closeInstanceDetailPane();
            }

            // Steps 6-8: Scroll to near the bottom, open instance, close detail pane
            InventoryInstances.scrollToRow(bottomIndex);
            InventoryInstances.selectInstance(bottomIndex);
            InventoryInstances.verifyRowIsHighlighted(bottomIndex);
            InventorySearchAndFilter.closeInstanceDetailPane();

            // Steps 9-10: Open record near bottom, enter edit mode, cancel, close detail pane
            InventoryInstances.scrollToRow(previousBottomIndex);
            InventoryInstances.selectInstance(previousBottomIndex);
            InventoryInstances.verifyRowIsHighlighted(previousBottomIndex);
            InventoryInstance.editInstance();
            InstanceRecordEdit.close();
            InventorySearchAndFilter.closeInstanceDetailPane();
          });
        };

        const tabs = [
          {
            switchTab: null,
            verifyTab: null,
          },
          {
            switchTab: () => InventorySearchAndFilter.switchToHoldings(),
            verifyTab: () => InventorySearchAndFilter.holdingsTabIsDefault(),
          },
          {
            switchTab: () => InventorySearchAndFilter.switchToItem(),
            verifyTab: () => InventorySearchAndFilter.itemTabIsDefault(),
          },
        ];

        tabs.forEach(({ switchTab, verifyTab }) => {
          if (switchTab) {
            switchTab();
            verifyTab();
            InventorySearchAndFilter.verifyResultPaneEmpty();
          }
          InventorySearchAndFilter.executeSearch('*');
          InventoryInstances.waitLoading();
          verifyScrollPositionSteps();
        });
      },
    );
  });
});
