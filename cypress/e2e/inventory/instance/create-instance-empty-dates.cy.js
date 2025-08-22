import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import { INSTANCE_DATE_TYPES } from '../../../support/constants';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `AT_C552515_FolioInstance_${getRandomPostfix()}`,
      dateType: INSTANCE_DATE_TYPES.DETAILED,
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
      'C552515 Create Instance with selected "Date type" and empty "Date 1" and "Date 2" fields (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C552515'] },
      () => {
        const InventoryNewInstance = InventoryInstances.addNewInventory();

        InventoryNewInstance.fillRequiredValues(testData.instanceTitle);
        InstanceRecordEdit.verifyDateFieldsPresent();
        InstanceRecordEdit.fillDates(undefined, undefined, testData.dateType);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);

        InstanceRecordView.verifyDates(undefined, undefined, testData.dateType);
      },
    );
  });
});
