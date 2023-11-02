import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';

describe('inventory', () => {
  describe('Instance', () => {
    let user;

    before('create test data and login', () => {
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C405565 (NON-CONSORTIA) Verify the action for creating new local/shared records is NOT available on Non-consortia tenant (folijet) (TaaS)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        InventorySearchAndFilter.verifyPanesExist();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventoryInstances.verifyActionMenuForNonConsortiaTenant();
      },
    );
  });
});
