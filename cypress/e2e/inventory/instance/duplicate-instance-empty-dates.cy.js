import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `AT_C566517_FolioInstance_${getRandomPostfix()}`,
      duplicatedInstanceTitle: `AT_C566517_FolioInstance_${getRandomPostfix()}_DUPLICATE`,
    };

    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.then(() => {
        // Create a FOLIO instance with empty dates and date type as precondition
        InventoryInstance.createInstanceViaApi({
          instanceTitle: testData.instanceTitle,
        }).then(({ instanceData }) => {
          testData.instanceId = instanceData.instanceId;
        });
      }).then(() => {
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
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      InventoryInstances.deleteInstanceByTitleViaApi(testData.duplicatedInstanceTitle);
    });

    it(
      'C566517 Duplicate Instance with empty "Date type" dropdown and empty "Date 1", "Date 2" fields (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C566517'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InstanceRecordView.waitLoading();

        InstanceRecordView.duplicate();
        InventoryNewInstance.waitLoading();
        InstanceRecordEdit.fillResourceTitle(testData.duplicatedInstanceTitle);
        InstanceRecordEdit.verifyDateFieldsValues();
        InstanceRecordEdit.saveAndClose();

        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyInstanceIsOpened(testData.duplicatedInstanceTitle);
        InstanceRecordView.verifyDates(undefined, undefined, undefined);
      },
    );
  });
});
