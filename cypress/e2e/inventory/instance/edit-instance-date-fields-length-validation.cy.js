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
      instanceTitle: `C552531 Auto ${getRandomPostfix()}`,
      date1set: ['1999u', '1', '12', '12b', '12b6', '12b6', '12b6'],
      date2set: ['20b27', '9', '199u', '199u', '19', '199', '199u'],
      dateType: INSTANCE_DATE_TYPES.RANGE,
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
      'C552531 Cannot update Instance with more or less than 4 characters in "Date 1" and "Date 2" fields (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C552531'] },
      () => {
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.verifyDateFieldsValues();
        InstanceRecordEdit.fillDates(
          testData.date1set[0],
          testData.date2set[0],
          testData.dateType,
          true,
        );
        InstanceRecordEdit.clickSaveAndKeepEditingButton();
        InstanceRecordEdit.verifySuccessfulMessage();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.verifyDateFieldsValues(
          testData.date1set[0].slice(0, 4),
          testData.date2set[0].slice(0, 4),
          testData.dateType,
        );

        InstanceRecordEdit.fillDates(testData.date1set[1], testData.date2set[1]);
        InstanceRecordEdit.clickSaveAndCloseButton();
        InstanceRecordEdit.verifyDateFieldsValidationErrors(true, true);

        InstanceRecordEdit.fillDates(testData.date1set[2], testData.date2set[2]);
        InstanceRecordEdit.clickSaveAndCloseButton();
        InstanceRecordEdit.verifyDateFieldsValidationErrors(true, false);

        InstanceRecordEdit.fillDates(testData.date1set[3], testData.date2set[3]);
        InstanceRecordEdit.clickSaveAndCloseButton();
        InstanceRecordEdit.verifyDateFieldsValidationErrors(true, false);

        InstanceRecordEdit.fillDates(testData.date1set[4], testData.date2set[4]);
        InstanceRecordEdit.clickSaveAndCloseButton();
        InstanceRecordEdit.verifyDateFieldsValidationErrors(false, true);

        InstanceRecordEdit.fillDates(testData.date1set[5], testData.date2set[5]);
        InstanceRecordEdit.clickSaveAndCloseButton();
        InstanceRecordEdit.verifyDateFieldsValidationErrors(false, true);

        InstanceRecordEdit.fillDates(testData.date1set[6], testData.date2set[6]);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordEdit.verifySuccessfulMessage();
        InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
        InstanceRecordView.verifyDates(
          testData.date1set[6],
          testData.date2set[6],
          testData.dateType,
        );
      },
    );
  });
});
