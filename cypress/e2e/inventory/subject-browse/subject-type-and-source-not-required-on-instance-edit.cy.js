import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const testData = {};

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi({
        instanceTitle: `AT_C584411_FolioInstance_${getRandomPostfix()}`,
      }).then(({ instanceData }) => {
        testData.instance = instanceData;
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
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      });
    });

    it(
      'C584411 Check the subject type and source fields are not required on Instance Edit page (promin)',
      { tags: ['extendedPath', 'promin', 'C584411'] },
      () => {
        // Step 1: Search for instance; open detail view
        InventoryInstances.searchByTitle(testData.instance.instanceId);
        InventoryInstances.selectInstanceById(testData.instance.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 2: Click Actions > Edit instance
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();

        // Step 3: Click Add subject; verify row with Subject, Subject source, Subject type fields
        InstanceRecordEdit.clickAddSubjectButton();
        InstanceRecordEdit.verifySubjectRowIsDisplayed();

        // Step 4: Save & close; verify instance details opened, subject accordion empty, no errors
        InstanceRecordEdit.saveAndClose();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.openSubjectAccordion();
        InstanceRecordView.verifyOnlyEmptySubjectRow();
        InteractorsTools.checkNoErrorCallouts();
      },
    );
  });
});
