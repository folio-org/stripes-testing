import { APPLICATION_NAMES, LOCATION_NAMES } from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import StatisticalCodes from '../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Holdings', () => {
      const testData = {
        instanceTitle: `AT_C651462_Test instance for version history ${getRandomPostfix()}`,
        locationName: LOCATION_NAMES.ANNEX_UI,
        statisticalCodes: [],
      };

      before('Create test data', () => {
        cy.getAdminToken()
          .then(() => {
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              testData.instanceTypeId = instanceTypes[0].id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
              testData.holdingTypeId = holdingTypes[0].id;
            });
            cy.getLocations({ query: `name="${testData.locationName}"` }).then((locationResp) => {
              testData.locationId = locationResp.id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.sourceId = folioSource.id;
            });
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.instanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.locationId,
                },
              ],
            }).then((createdInstance) => {
              testData.instanceId = createdInstance.instanceId;
            });
          });
        for (let index = 0; index < 30; index++) {
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
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstanceRecordViewOpened();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
        testData.statisticalCodes.forEach((statisticalCode) => {
          StatisticalCodes.deleteViaApi(statisticalCode.id);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C651462 Check "Version history" after load testing on Holding (folijet)',
        { tags: ['criticalPath', 'folijet', 'C651462'] },
        () => {
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.clickCloseButton();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.edit();
          for (let index = 0; index < 20; index++) {
            HoldingsRecordEdit.addStatisticalCode(testData.statisticalCodes[index].code, index + 1);
          }
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyListOfChanges(['Statistical codes (Added)']);
          VersionHistorySection.clickCloseButton();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.edit();
          for (let index = 10; index < 20; index++) {
            HoldingsRecordEdit.removeStatisticalCode(testData.statisticalCodes[index].code);
          }
          for (let index = 0; index < 10; index++) {
            HoldingsRecordEdit.addStatisticalCode(
              testData.statisticalCodes[20 + index].code,
              11 + index,
            );
          }
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: ['Statistical codes (Removed)', 'Statistical codes (Added)'],
          });
        },
      );
    });
  });
});
