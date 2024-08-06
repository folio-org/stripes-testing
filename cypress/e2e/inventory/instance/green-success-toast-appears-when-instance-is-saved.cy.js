import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import StatisticalCodes from '../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `C345346 autoTestInstanceTitle${getRandomPostfix()}`,
    };

    before('Create user and login', () => {
      cy.getAdminToken();
      StatisticalCodes.createViaApi().then((resp) => {
        testData.statisticalCode = `ARL (Collection stats):    ${resp.code} - ${resp.name}`;
        testData.statisticalCodeUI = resp.name;
        testData.statisticalCodeId = resp.id;
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
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceHRID}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
        StatisticalCodes.deleteViaApi(testData.statisticalCodeId);
      });
    });

    it(
      'C345346 Green success toast appears when Instance is saved (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        const InventoryNewInstance = InventoryInstances.addNewInventory();
        InventoryNewInstance.fillRequiredValues(testData.instanceTitle);
        InventoryNewInstance.clickSaveAndCloseButton();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testData.instanceHRID = initialInstanceHrId;

          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.addStatisticalCode(testData.statisticalCode);
          InstanceRecordEdit.saveAndClose();
          InteractorsTools.checkCalloutMessage(
            `The instance - HRID ${initialInstanceHrId} has been successfully saved.`,
          );
          InstanceRecordView.verifyInstanceRecordViewOpened();
        });
      },
    );
  });
});
