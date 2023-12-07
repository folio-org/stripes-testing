import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import Helper from '../../../support/fragments/finance/financeHelper';

describe('inventory', () => {
  describe('Instance', () => {
    let user;
    const instanceSource = 'FOLIO';
    const instanceTitle = `C402776 autotestInstance ${getRandomPostfix()}`;
    const itemBarcode = Helper.getRandomBarcode();

    before('create test data and login', () => {
      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstances.createInstanceViaApi(instanceTitle, itemBarcode);
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
      });
    });

    it(
      'C402776 (NON-CONSORTIA) Verify the Source of a FOLIO Instance on non-consortial tenant (folijet) (TaaS)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        InventorySearchAndFilter.verifyPanesExist();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventoryInstances.searchBySource(instanceSource);
        InventorySearchAndFilter.searchInstanceByTitle(instanceTitle);
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.verifyInstanceSource(instanceSource);
      },
    );
  });
});
