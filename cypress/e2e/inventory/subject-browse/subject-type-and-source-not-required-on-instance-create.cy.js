import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C584410_FolioInstance_${randomPostfix}`,
      user: {},
    };

    before('Create user and login', () => {
      cy.getAdminToken();
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
        InventoryInstances.deleteInstanceByTitleViaApi('C584410_');
      });
    });

    it(
      'C584410 Check the subject type and source fields are not required on Instance Create page (promin)',
      { tags: ['extendedPath', 'promin', 'C584410'] },
      () => {
        // Step 1: Click Actions > + New; verify New instance page opened
        InventoryInstances.addNewInventory();
        InventoryNewInstance.waitLoading();

        // Step 2: Populate Resource title and Resource type
        InventoryNewInstance.fillRequiredValues(testData.instanceTitle);

        // Step 3: Click Add subject; verify row with Subject, Subject source, Subject type fields
        InstanceRecordEdit.clickAddSubjectButton();
        InstanceRecordEdit.verifySubjectRowIsDisplayed();

        // Step 4: Save & close; verify instance details opened, subject accordion empty, no errors
        InventoryNewInstance.clickSaveCloseButton();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.verifyOnlyEmptySubjectRow();
        InteractorsTools.checkNoErrorCallouts();
      },
    );
  });
});
