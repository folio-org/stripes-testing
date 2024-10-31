import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    const testData = {
      natureOfContent: 'audiobook',
      natureOfContentForChanging: 'bibliography',
    };

    before('Create test data and login', () => {
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

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"title"=="${testData.instance.instanceTitle}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });
    });

    it(
      'C9214 In Accordion Descriptive Data --> Test assigning Nature of content (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C9214'] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.addNatureOfContent();
        InstanceRecordEdit.selectNatureOfContent(testData.natureOfContent);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifyNatureOfContent(testData.natureOfContent);
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.selectNatureOfContent(testData.natureOfContentForChanging);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifyNatureOfContent(testData.natureOfContentForChanging);
      },
    );
  });
});
