import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import { INSTANCE_STATUS_TERM_NAMES } from '../../../support/constants';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import Helper from '../../../support/fragments/finance/financeHelper';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';

describe('inventory', () => {
  describe('Instance', () => {
    let user;
    const instanceTitle = `C407752 autotestInstance ${getRandomPostfix()}`;
    const itemBarcode = Helper.getRandomBarcode();

    before('create test data and login', () => {
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

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
      });
    });

    it(
      'C407752 (NON-CONSORTIA) Verify the permission for editing instance on Non-consortia tenant (folijet) (TaaS)',
      { tags: [TestTypes.smoke, DevTeams.folijet] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(instanceTitle);
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;

          InstanceRecordView.edit();
          InstanceRecordEdit.chooseInstanceStatusTerm(
            `${INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED} (folio: batch)`,
          );
          InstanceRecordEdit.saveAndClose();
          InstanceRecordView.verifyCalloutMessage(
            `The instance - HRID ${instanceHrid} has been successfully saved.`,
          );
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyInstanceStatusTerm(INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED);
        });
      },
    );
  });
});
