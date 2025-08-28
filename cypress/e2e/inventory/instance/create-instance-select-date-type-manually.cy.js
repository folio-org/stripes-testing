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
      instanceTitle: `AT_C566513_FolioInstance_${getRandomPostfix()}`,
      date1: '1995',
      date2: '200u',
      initialDateType: INSTANCE_DATE_TYPES.DETAILED,
      dateTypePlaceHolder: InstanceRecordEdit.dateTypePlaceholderOption,
      defaultDateType: INSTANCE_DATE_TYPES.NO,
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
      'C566513 Create Instance with selected "Select date type" value in "Date type" dropdown mannually (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C566513'] },
      () => {
        const InventoryNewInstance = InventoryInstances.addNewInventory();

        InventoryNewInstance.fillRequiredValues(testData.instanceTitle);
        InstanceRecordEdit.verifyDateFieldsPresent();
        InstanceRecordEdit.fillDates(undefined, undefined, testData.initialDateType);
        InstanceRecordEdit.fillDates(testData.date1, testData.date2, undefined);
        InstanceRecordEdit.fillDates(testData.date1, testData.date2, testData.dateTypePlaceHolder);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);

        InstanceRecordView.verifyDates(testData.date1, testData.date2, testData.defaultDateType);
      },
    );
  });
});
