import { APPLICATION_NAMES, INSTANCE_STATUS_TERM_NAMES } from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../../support/fragments/inventory/inventoryNewInstance';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Instance', () => {
      const testData = {
        instance: {
          title: `AT_C651457_Test instance for version history ${getRandomPostfix()}`,
        },
        instanceStatusTerm1: INSTANCE_STATUS_TERM_NAMES.CATALOGED,
        instanceStatusTerm2: INSTANCE_STATUS_TERM_NAMES.UNCATALOGED,
        modeOfIssuance1: 'serial',
        modeOfIssuance2: 'single unit',
        dateType: 'Multiple dates',
      };

      before('Create test data', () => {
        cy.getAdminToken();

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventory],
          );

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.instance.id);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C651457 Check "Version history" after creating,editing and deleting non-repeatable fields in Instance (folijet)',
        { tags: ['extendedPath', 'folijet', 'C651457'] },
        () => {
          // Create a new FOLIO instance
          InventoryInstances.addNewInventory();
          InventoryNewInstance.fillResourceTitle(testData.instance.title);
          InventoryNewInstance.fillResourceType();
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InventoryInstance.getId().then((id) => {
            testData.instance.id = id;
          });

          // Check initial version history
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(1);
          VersionHistorySection.clickCloseButton();

          // Add Instance status term (CREATE non-repeatable field)
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.chooseInstanceStatusTerm(testData.instanceStatusTerm1);
          InstanceRecordEdit.clickSaveAndCloseButton();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(2);
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: ['Instance status term (Added)', 'Status updated date (Edited)'],
          });
          VersionHistorySection.clickCloseButton();

          // Edit Instance status term (EDIT non-repeatable field)
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.chooseInstanceStatusTerm(testData.instanceStatusTerm2);
          InstanceRecordEdit.chooseModeOfIssuance(testData.modeOfIssuance1);
          InstanceRecordEdit.clickSaveAndCloseButton();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(3);
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: [
              'Mode of issuance (Added)',
              'Instance status term (Edited)',
              'Status updated date (Edited)',
            ],
          });
          VersionHistorySection.clickCloseButton();

          // Clear Instance status term (DELETE non-repeatable field)
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.clearInstanceStatusTerm();
          InstanceRecordEdit.chooseModeOfIssuance(testData.modeOfIssuance2);
          InstanceRecordEdit.chooseDateType(testData.dateType);
          InstanceRecordEdit.clickSaveAndCloseButton();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(4);
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: [
              'Date type (Added)',
              'Mode of issuance (Edited)',
              'Status updated date (Edited)',
              'Instance status term (Removed)',
            ],
          });
          VersionHistorySection.clickCloseButton();
        },
      );
    });
  });
});
