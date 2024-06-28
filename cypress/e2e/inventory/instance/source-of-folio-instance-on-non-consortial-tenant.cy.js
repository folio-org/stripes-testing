import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import Helper from '../../../support/fragments/finance/financeHelper';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    const instanceSource = INSTANCE_SOURCE_NAMES.FOLIO;
    const instanceTitle = `C402776 autotestInstance ${getRandomPostfix()}`;
    const itemBarcode = Helper.getRandomBarcode();

    before('Create test data and login', () => {
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

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
      });
    });

    it(
      'C402776 (NON-CONSORTIA) Verify the Source of a FOLIO Instance on non-consortial tenant (folijet) (TaaS)',
      { tags: ['criticalPath', 'folijet', 'shiftLeft'] },
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
