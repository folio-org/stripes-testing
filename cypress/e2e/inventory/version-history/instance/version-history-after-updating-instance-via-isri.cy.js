import { APPLICATION_NAMES } from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import Z3950TargetProfiles from '../../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Instance', () => {
      const testData = {
        OCLCAuthentication: '100481406/PAOLF',
        oclcNumber: '1234567',
        instanceStatusTerm: 'Cataloged',
      };

      before('Create test data', () => {
        cy.getAdminToken();
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(testData.OCLCAuthentication);
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventory, CapabilitySets.uiInventorySingleRecordImport],
          );

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstanceRecordViewOpened();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceHrid}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C655266 Check "Version history" after updating instance via ISRI (folijet)',
        { tags: ['extendedPath', 'folijet', 'C655266'] },
        () => {
          InventoryInstance.startOverlaySourceBibRecord();
          InventoryInstance.overlayWithOclc(testData.oclcNumber);
          InventoryInstance.waitLoading();
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            testData.instanceHrid = initialInstanceHrId;
          });
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(2);
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: [
              'Index title (Added)',
              'Mode of issuance (Added)',
              'Date 1 (Added)',
              'Date type (Added)',
              'Alternative titles (Added)',
              'Classifications (Added)',
              'Contributors (Added)',
              'Identifiers (Added)',
              'Formats (Added)',
              'Languages (Added)',
              'Instance notes (Added)',
              'Physical descriptions (Added)',
              'Publications (Added)',
              'Subjects (Added)',
              'Resource type (Edited)',
              'Source (Edited)',
              'Title (Edited)',
            ],
          });
          VersionHistorySection.clickCloseButton();

          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.chooseInstanceStatusTerm(testData.instanceStatusTerm);
          InstanceRecordEdit.clickSaveAndCloseButton();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.verifyInstanceStatusTerm(testData.instanceStatusTerm);
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: ['Instance status term (Added)', 'Status updated date (Edited)'],
          });
        },
      );
    });
  });
});
