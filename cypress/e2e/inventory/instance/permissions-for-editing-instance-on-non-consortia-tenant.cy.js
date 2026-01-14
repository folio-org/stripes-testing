import { INSTANCE_STATUS_TERM_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import Helper from '../../../support/fragments/finance/financeHelper';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe(
    'Instance',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let user;
      let instanceTitle;
      let itemBarcode;

      beforeEach('Create test data and login', () => {
        instanceTitle = `C407752 autotestInstance ${getRandomPostfix()}`;
        itemBarcode = Helper.getRandomBarcode();

        cy.getAdminToken().then(() => {
          InventoryInstances.createInstanceViaApi(instanceTitle, itemBarcode);
        });

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

      afterEach('Delete test data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
        });
      });

      it(
        'C407752 (NON-CONSORTIA) Verify the permission for editing instance on Non-consortia tenant (folijet) (TaaS)',
        { tags: ['smoke', 'folijet', 'C407752', 'shiftLeft'] },
        () => {
          InventorySearchAndFilter.searchInstanceByTitle(instanceTitle);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.edit();
          InstanceRecordEdit.chooseInstanceStatusTerm(INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED);
          InstanceRecordEdit.saveAndClose();
          InstanceRecordView.verifySuccsessCalloutMessage();
          cy.reload();
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyInstanceStatusTerm(INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED);
        },
      );
    },
  );
});
