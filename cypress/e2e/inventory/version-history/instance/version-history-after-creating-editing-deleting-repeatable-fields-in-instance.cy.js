import { APPLICATION_NAMES } from '../../../../support/constants';
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
          title: `AT_C651552_Test instance for version history ${getRandomPostfix()}`,
        },
      };

      before('Create test data', () => {
        cy.getAdminToken();
        ['books', 'rmusic', 'serials', 'maps', 'mfilm'].forEach((code, index) => {
          cy.getStatisticalCodes({ limit: 1, query: `code=="${code}"` }).then((response) => {
            testData[`statisticalCode${index + 1}`] =
              `ARL (Collection stats):    ${response[0].code} - ${response[0].name}`;
          });
        });

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
        'C651552 Check "Version history" after creating,editing and deleting repeatable fields in Instance (folijet)',
        { tags: ['extendedPath', 'folijet', 'C651552'] },
        () => {
          InventoryInstances.addNewInventory();
          InventoryNewInstance.fillResourceTitle(testData.instance.title);
          InventoryNewInstance.fillResourceType();
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InventoryInstance.getId().then((id) => {
            testData.instance.id = id;
          });
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(1);
          VersionHistorySection.verifyOriginalVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
          });
          VersionHistorySection.clickCloseButton();

          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.addStatisticalCode(testData.statisticalCode1, 0);
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
            changes: ['Statistical codes (Added)'],
          });
          VersionHistorySection.clickCloseButton();

          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.chooseStatisticalCode(testData.statisticalCode2, 0);
          InstanceRecordEdit.addStatisticalCode(testData.statisticalCode3, 1);
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
            changes: ['Statistical codes (Added)', 'Statistical codes (Removed)'],
          });
          VersionHistorySection.clickCloseButton();

          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.chooseStatisticalCode(testData.statisticalCode4, 0);
          InstanceRecordEdit.chooseStatisticalCode(testData.statisticalCode5, 1);
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
            changes: ['Statistical codes (Added)', 'Statistical codes (Removed)'],
          });
          VersionHistorySection.clickCloseButton();
        },
      );
    });
  });
});
