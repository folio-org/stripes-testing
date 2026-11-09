import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {};

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.getModesOfIssuance().then((mode) => {
        testData.modeOfIssuance = mode.name;
      });
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        InventoryInstance.createInstanceViaApi({
          instanceTitle: `AT_C603_FolioInstance_${getRandomPostfix()}`,
        }).then(({ instanceData }) => {
          testData.instance = instanceData;
        });

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    });

    it(
      'C603 In Accordion Administrative Data --> Test assigning Mode of issuance (promin)',
      { tags: ['extendedPath', 'promin', 'C603'] },
      () => {
        // Step 1: Find and open Edit instance
        InventoryInstances.searchByTitle(testData.instance.instanceId);
        InventoryInstances.selectInstanceById(testData.instance.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();

        // Step 2: Select a Mode of issuance value
        InstanceRecordEdit.chooseModeOfIssuance(testData.modeOfIssuance);

        // Step 3: Save & close; verify the value is shown in detail view
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.verifyModeOfIssuance(testData.modeOfIssuance);
      },
    );
  });
});
