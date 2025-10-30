import InstanceRecordView from // actionsMenuOptions,
  '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
// import Users from '../../../support/fragments/users/users';
import SetRecordForDeletionModal from '../../../support/fragments/inventory/modals/setRecordForDeletionModal';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Set record for deletion', () => {
    const testData = {
      instanceTitle: `AT_C445997_FolioInstance_${getRandomPostfix()}`,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
        ({ instanceData }) => {
          testData.instanceId = instanceData.instanceId;
        },
      );

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [
            CapabilitySets.uiInventoryInstanceEdit,
            CapabilitySets.uiInventoryInstanceSetRecordsForDeletion,
          ],
        );

        // cy.login(testData.user.username, testData.user.password);
        cy.loginAsAdmin();
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(testData.instanceId);
      });
    });

    // after('Delete test data', () => {
    //   cy.getAdminToken().then(() => {
    //     Users.deleteViaApi(testData.user.userId);
    //     InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    //   });
    // });

    it(
      'C445997 Check "Set record for deletion" action for FOLIO Instance in Actions menu (folijet)',
      { tags: ['extendedPath', 'folijet', 'C445997'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.clickActionsButton();
        InstanceRecordView.setRecordForDeletion();
        SetRecordForDeletionModal.waitLoading();
        SetRecordForDeletionModal.verifyModalView(testData.instanceTitle);
        SetRecordForDeletionModal.clickConfirm();
        SetRecordForDeletionModal.isNotDisplayed();
        InstanceRecordView.verifyInstanceIsSetForDeletionSuppressedFromDiscoveryStaffSuppressedWarning();
        InstanceRecordView.waitLoading();
        InteractorsTools.checkCalloutMessage(`${testData.instanceTitle} has been set for deletion`);
        // Setting record as active functionality not implemented yet
        // Uncomment after implementing
        // InstanceRecordView.validateOptionInActionsMenu(
        //   actionsMenuOptions.setRecordAsActive,
        //   true,
        // );
        // InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery();
        // InstanceRecordView.verifyInstanceIsMarkedAsStaffSuppressed();
        // InstanceRecordView.verifyInstanceIsSetForDeletion(false);
      },
    );
  });
});
