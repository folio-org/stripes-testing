import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `AT_C566515_FolioInstance_${getRandomPostfix()}`,
    };

    before('Login', () => {
      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C566515 Create Instance without selected "Date type" and with empty "Date 1", "Date 2" fields (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C566515'] },
      () => {
        const InventoryNewInstance = InventoryInstances.addNewInventory();

        InventoryNewInstance.fillRequiredValues(testData.instanceTitle);
        InstanceRecordEdit.verifyDateFieldsPresent();
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);

        InstanceRecordView.verifyDates(undefined, undefined, undefined);
      },
    );
  });
});
