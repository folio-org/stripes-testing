import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C601_FolioInstance_${randomPostfix}`,
    };

    before('Create test data', () => {
      cy.getAdminToken();

      cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });

      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
        }).then((createdInstance) => {
          testData.instanceId = createdInstance.instanceId;
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      if (testData.user?.userId) Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C601 Test that editable sections of the edit screen can be updated and displays data properly after saving (promin)',
      { tags: ['extendedPath', 'promin', 'C601'] },
      () => {
        const todayDate = DateTools.getFormattedDate({ date: new Date() });

        // Step 1: Find and edit the instance
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        // Step 2: Verify Instance HRID and Source* fields are NOT editable
        InstanceRecordEdit.verifyInstanceHridAndSourceAreNotEditable();

        // Step 3: Change Cataloged date to today, save & close; verify edit is displayed correctly
        InstanceRecordEdit.fillCatalogedDate(todayDate);
        InstanceRecordEdit.saveAndClose();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        InstanceRecordView.verifyCatalogedDate(todayDate);
        InteractorsTools.checkNoErrorCallouts();
      },
    );
  });
});
