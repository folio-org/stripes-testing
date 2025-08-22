import { Permissions } from '../../../support/dictionary';
import { INSTANCE_STATUS_TERM_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      user: {},
      instanceTitle: `AT_C478275_MarcInstance_${getRandomPostfix()}`,
      updatedStatusTerm: INSTANCE_STATUS_TERM_NAMES.CATALOGED,
    };

    const marcInstanceFields = [
      {
        tag: '008',
        content: { ...QuickMarcEditor.defaultValid008Values, Lang: 'eng' },
      },
      {
        tag: '245',
        content: `$a ${testData.instanceTitle}`,
        indicators: ['1', '1'],
      },
    ];

    let instanceId;

    before('Create test data', () => {
      cy.getAdminToken();
      // Create a MARC instance for testing
      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
        (id) => {
          instanceId = id;
        },
      );

      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    it(
      'C478275 Saving record using "Save & keep editing" button when editing an "Instance" record with source "MARC" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C478275'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
        }, 20_000);
        InventoryInstances.waitContentLoading();

        // Step 1-2 Search and open MARC instance
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();

        // Step 3: Click on "Actions" in the third pane → Select "Edit instance"
        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.checkButtonsEnabled({
          saveAndClose: false,
          saveKeepEditing: false,
          cancel: true,
        });

        // Step 4: Update any editable field (e.g., change "Instance status term" value)
        InstanceRecordEdit.chooseInstanceStatusTerm(testData.updatedStatusTerm);
        InstanceRecordEdit.checkButtonsEnabled({
          saveAndClose: true,
          saveKeepEditing: true,
          cancel: true,
        });

        // Step 5: Note value in "Record last updated" updated accordion in "Administrative data" accordion
        // Step 6: Click on the "Save & keep editing" button
        InstanceRecordEdit.clickSaveAndKeepEditingButton();
        InstanceRecordEdit.verifySuccessfulMessage();
        InstanceRecordEdit.waitLoading();
        InventoryInstance.verifyLastUpdatedDate();
        InventoryInstance.verifyLastUpdatedSource(testData.user.firstName, testData.user.lastName);

        // Step 7: Click on "Record last updated: <<current date and time>>" accordion
        InventoryInstance.verifyLastUpdatedSource(testData.user.firstName, testData.user.lastName);

        // Step 8: Close the "Edit instance" window
        InstanceRecordEdit.close();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyInstanceStatusTerm(testData.updatedStatusTerm);
      },
    );
  });
});
