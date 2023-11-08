import getRandomPostfix from '../../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import Users from '../../../../support/fragments/users/users';

describe('inventory', () => {
  describe('Cataloging -> Maintaining the catalog', () => {
    let user;
    const testData = {
      newInstanceTitle: `autotest_instance_title_${getRandomPostfix()}`,
    };

    before('create test data and login', () => {
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"title"=="${testData.newInstanceTitle}"`,
      }).then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    });

    it(
      'C3495 Edit the title of an instance which has source FOLIO (record which do not have an underlying MARC record stored in SRS) (folijet) (TaaS)',
      { tags: [TestTypes.extended, DevTeams.folijet] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.fillResourceTitle(testData.newInstanceTitle);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifyResourceTitle(testData.newInstanceTitle);
      },
    );
  });
});
