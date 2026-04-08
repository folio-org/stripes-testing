import { APPLICATION_NAMES } from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../../support/fragments/inventory/inventoryNewInstance';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import StatisticalCodes from '../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Instance', () => {
      const testData = {
        instance: {
          title: `AT_C651461_Test instance for version history ${getRandomPostfix()}`,
        },
        statisticalCodes: [],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        for (let index = 0; index < 20; index++) {
          const uniquePostfix = `${getRandomPostfix()}_${index}`;
          StatisticalCodes.createViaApi({
            source: 'local',
            code: `autotest_code_${uniquePostfix}`,
            name: `autotest_statistical_code_${uniquePostfix}`,
            statisticalCodeTypeId: '3abd6fc2-b3e4-4879-b1e1-78be41769fe3',
          }).then((resp) => {
            testData.statisticalCodes.push({
              code: `ARL (Collection stats):    ${resp.code} - ${resp.name}`,
              name: resp.name,
              id: resp.id,
            });
          });
        }

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
        // testData.statisticalCodes.forEach((statisticalCode) => {
        //   StatisticalCodes.deleteViaApi(statisticalCode.id);
        // });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C651461 Check "Version history" after load testing on Instance (folijet)',
        { tags: ['criticalPath', 'folijet', 'C651461'] },
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
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.clickCloseButton();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          for (let index = 0; index < 20; index++) {
            InstanceRecordEdit.addStatisticalCode(testData.statisticalCodes[index].code, index);
          }
          InstanceRecordEdit.clickSaveAndCloseButton();
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyListOfChanges(['Statistical codes (Added)']);
          VersionHistorySection.clickCloseButton();
          InventoryInstance.waitLoading();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          for (let index = 0; index < 10; index++) {
            InstanceRecordEdit.deleteStatisticalCodeByName(testData.statisticalCodes[index].name);
          }
          InstanceRecordEdit.clickSaveAndCloseButton();
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyListOfChanges([
            'Statistical codes (Removed)',
            'Statistical codes (Added)',
          ]);
        },
      );
    });
  });
});
