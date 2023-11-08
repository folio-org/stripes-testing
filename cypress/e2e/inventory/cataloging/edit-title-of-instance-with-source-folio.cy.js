import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import Helper from '../../../support/fragments/finance/financeHelper';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';

describe('inventory', () => {
  describe('Cataloging -> Maintaining the catalog', () => {
    let user;
    const instanceTitle = `C3497 autotestInstance ${getRandomPostfix()}`;
    const instanceNewTitle = `C3497 new autotestInstance ${getRandomPostfix()}`;
    const itemBarcode = Helper.getRandomBarcode();

    before('create test data and login', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.createInstanceViaApi(instanceTitle, itemBarcode);
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
    });

    it(
      'C3497 Edit the title of an instance which has Source FOLIO (no underlying MARC record in SRS) (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(instanceTitle);
        InstanceRecordView.verifyInstancePaneExists();
        InventoryInstance.editInstance();
        InstanceRecordEdit.editResourceTitle(instanceNewTitle);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordEdit.verifySuccessfulMessage();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifyResourceTitle(instanceNewTitle);
      },
    );
  });
});
