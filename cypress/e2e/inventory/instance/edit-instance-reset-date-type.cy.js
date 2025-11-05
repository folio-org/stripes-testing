import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import { INSTANCE_DATE_TYPES } from '../../../support/constants';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `AT_C566514_FolioInstance_${getRandomPostfix()}`,
      date1: '1995',
      date2: '20UU',
      dateTypePlaceHolder: InstanceRecordEdit.dateTypePlaceholderOption,
      initialDateType: INSTANCE_DATE_TYPES.DETAILED,
      defaultDateType: INSTANCE_DATE_TYPES.NO,
    };

    before('Login', () => {
      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
          InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
            ({ instanceData }) => {
              testData.instanceId = instanceData.instanceId;
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventoryInstances.searchByTitle(testData.instanceId);
              InventoryInstances.selectInstanceById(testData.instanceId);
            },
          );
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C566514 Edit Instance with selected manually "Select date type" value in "Date type" dropdown (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C566514'] },
      () => {
        InstanceRecordView.waitLoading();
        InstanceRecordView.edit();

        InstanceRecordEdit.verifyDateFieldsValues();
        InstanceRecordEdit.fillDates(undefined, undefined, testData.initialDateType);
        InstanceRecordEdit.fillDates(testData.date1, testData.date2, testData.dateTypePlaceHolder);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordEdit.verifySuccessfulMessage();

        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
        InstanceRecordView.verifyDates(testData.date1, testData.date2, testData.defaultDateType);
      },
    );
  });
});
