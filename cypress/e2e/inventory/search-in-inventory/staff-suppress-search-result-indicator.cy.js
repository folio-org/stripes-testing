import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';

describe('Inventory', () => {
  describe('Result list', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C343210_FolioInstance_${randomPostfix}`;
    const instanceIds = [];
    let user;

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C343210_FolioInstance');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          [1, 2].forEach((folioIndex) => {
            const isStaffSuppressed = folioIndex === 2;
            const instance = {
              title: `${instanceTitlePrefix}_${folioIndex}`,
              instanceTypeId: instanceTypes[0].id,
            };
            if (isStaffSuppressed) {
              instance.staffSuppress = true;
            }
            InventoryInstances.createFolioInstanceViaApi({
              instance,
            }).then((instanceData) => {
              instanceIds.push(instanceData.instanceId);
            });
          });
        });
      }).then(() => {
        cy.createTempUser([
          Permissions.enableStaffSuppressFacet.gui,
          Permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C343210 Result list. Clear visual display if record is marked as Staff suppressed (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C343210'] },
      () => {
        InventoryInstances.searchByTitle(instanceTitlePrefix);
        InventorySearchAndFilter.verifyResultListExists();
        InventorySearchAndFilter.verifyWarningIconForSearchResult(
          `${instanceTitlePrefix}_1`,
          false,
        );
        InventorySearchAndFilter.verifyWarningIconForSearchResult(`${instanceTitlePrefix}_2`, true);

        InventoryInstances.selectInstanceByTitle(`${instanceTitlePrefix}_2`);
        InventoryInstance.waitLoading();
        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.verifyStaffSuppressCheckbox(true);
        InstanceRecordEdit.markAsStaffSuppress();
        InstanceRecordEdit.verifyStaffSuppressCheckbox(false);
        InstanceRecordEdit.saveAndClose();
        InventoryInstance.waitLoading();

        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventoryInstances.searchByTitle(instanceTitlePrefix);
        InventorySearchAndFilter.verifyResultListExists();
        InventorySearchAndFilter.verifyWarningIconForSearchResult(
          `${instanceTitlePrefix}_1`,
          false,
        );
        InventorySearchAndFilter.verifyWarningIconForSearchResult(
          `${instanceTitlePrefix}_2`,
          false,
        );
      },
    );
  });
});
