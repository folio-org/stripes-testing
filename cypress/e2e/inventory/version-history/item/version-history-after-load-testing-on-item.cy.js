import {
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordEdit from '../../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import StatisticalCodes from '../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Item', () => {
      const testData = {
        instance: {
          title: `AT_C651459_Test instance for version history ${getRandomPostfix()}`,
        },
        item: {
          barcode: `${getRandomPostfix()}`,
        },
        statisticalCodes: [],
      };

      before('Create test data', () => {
        cy.getAdminToken()
          .then(() => {
            cy.getDefaultMaterialType().then((materialTypes) => {
              testData.materialType = materialTypes;
            });
            InventoryHoldings.getHoldingSources({ limit: 1 }).then((source) => {
              testData.holdingsSourceId = source.id;
            });
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              testData.instanceTypes = instanceTypes;
            });
            cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
              testData.holdingTypes = holdingTypes;
            });
            cy.getLoanTypes({ query: `name=="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
              testData.loanTypeId = res[0].id;
            });
            cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX_UI}"` }).then((res) => {
              testData.location = res;
            });
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypes[0].id,
                title: testData.instance.title,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypes[0].id,
                  permanentLocationId: testData.location.id,
                  sourceId: testData.holdingsSourceId,
                },
              ],
              items: [
                {
                  barcode: testData.item.barcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialType.id },
                },
              ],
            }).then((specialInstanceIds) => {
              testData.instance.id = specialInstanceIds;
            });
          });
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
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.item.barcode);
        testData.statisticalCodes.forEach((statisticalCode) => {
          StatisticalCodes.deleteViaApi(statisticalCode.id);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C651459 Check "Version history" after load testing on Item (folijet)',
        { tags: ['criticalPath', 'folijet', 'C651459'] },
        () => {
          InventorySearchAndFilter.searchByParameter('Title (all)', testData.instance.title);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InventoryInstance.openHoldingsAccordion(testData.location.name);
          InventoryInstance.openItemByBarcode(testData.item.barcode);
          ItemRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.clickCloseButton();
          ItemRecordView.openItemEditForm(testData.instance.title);
          for (let index = 0; index < 20; index++) {
            ItemRecordEdit.addStatisticalCode(testData.statisticalCodes[index].code, index);
          }
          ItemRecordEdit.saveAndClose();
          ItemRecordView.waitLoading();
          ItemRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyListOfChanges(['Statistical codes (Added)']);
          VersionHistorySection.clickCloseButton();
          ItemRecordView.openItemEditForm(testData.instance.title);
          for (let index = 0; index < 10; index++) {
            ItemRecordEdit.deleteStatisticalCodeByName(testData.statisticalCodes[index].name);
          }
          ItemRecordEdit.saveAndClose();
          ItemRecordView.waitLoading();
          ItemRecordView.clickVersionHistoryButton();
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
