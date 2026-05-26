import {
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
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
import DeveloperPane from '../../../../support/fragments/settings/developer/developerPane';
import UserLocale from '../../../../support/fragments/settings/developer/user-locate/temporaryUserLocale';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import StatisticalCodes from '../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Item', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instance: {
          title: `AT_C656282_ItemVersionHistory_${randomPostfix}`,
        },
        item: {
          barcode: `AT_C656282_${randomPostfix}`,
        },
        newTimezone: 'Europe/Paris',
        initialTimestamp: null,
        statisticalCode: {},
      };

      function openInstanceDetails() {
        InventorySearchAndFilter.searchByParameter('Title (all)', testData.instance.title);
        InventoryInstances.selectInstance();
        InstanceRecordView.verifyInstanceRecordViewOpened();
      }

      function openItemDetails() {
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        InventoryInstance.openItemByBarcode(testData.item.barcode);
        ItemRecordView.waitLoading();
      }

      function openItemVersionHistory() {
        ItemRecordView.clickVersionHistoryButton();
        VersionHistorySection.waitLoading();
        VersionHistorySection.verifyVersionHistoryPane(3);
      }

      before('Create test data', () => {
        cy.getAdminToken()
          .then(() => {
            cy.getDefaultMaterialType().then((materialType) => {
              testData.materialType = materialType;
            });
            InventoryHoldings.getHoldingSources({ limit: 1 }).then((source) => {
              testData.holdingsSourceId = source.id;
            });
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              testData.instanceTypeId = instanceTypes[0].id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
              testData.holdingTypeId = holdingTypes[0].id;
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
                instanceTypeId: testData.instanceTypeId,
                title: testData.instance.title,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
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
            }).then((createdInstance) => {
              testData.instance.id = createdInstance.instanceId;
            });
          })
          .then(() => {
            StatisticalCodes.createViaApi({
              source: 'local',
              code: `autotest_code_${randomPostfix}`,
              name: `autotest_statistical_code_${randomPostfix}`,
              statisticalCodeTypeId: '3abd6fc2-b3e4-4879-b1e1-78be41769fe3',
            }).then((statisticalCode) => {
              testData.statisticalCode = {
                id: statisticalCode.id,
                code: `ARL (Collection stats):    ${statisticalCode.code} - ${statisticalCode.name}`,
              };
            });
          })
          .then(() => {
            cy.createTempUser([]).then((userProperties) => {
              testData.user = userProperties;

              cy.assignCapabilitiesToExistingUser(
                testData.user.userId,
                [],
                [CapabilitySets.uiInventory, CapabilitySets.uiDeveloperSettingsUserLocaleView],
              );

              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        cy.setVersionHistoryRecordsPerPage(10);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.item.barcode);
        StatisticalCodes.deleteViaApi(testData.statisticalCode.id);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C656282 Check "Version history" of Item with non-default time zone (folijet)',
        { tags: ['extendedPath', 'folijet', 'C656282'] },
        () => {
          // Precondition: open the instance and update the item at least twice.
          openInstanceDetails();
          openItemDetails();
          ItemRecordView.openItemEditForm(testData.instance.title);
          ItemRecordEdit.addStatisticalCode(testData.statisticalCode.code);
          ItemRecordEdit.saveAndClose({ itemSaved: true });
          ItemRecordView.waitLoading();

          ItemRecordView.openItemEditForm(testData.instance.title);
          ItemRecordEdit.fillItemRecordFields({ materialType: MATERIAL_TYPE_NAMES.DVD });
          ItemRecordEdit.saveAndClose({ itemSaved: true });
          ItemRecordView.waitLoading();
          ItemRecordView.closeDetailView();

          // Steps 1-2: Open Item details and note the Version history timestamp in the default timezone.
          InventoryInstance.waitLoading();
          openItemDetails();
          openItemVersionHistory();
          VersionHistorySection.verifyCurrentVersionCard({
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            changes: ['Material type (Edited)'],
          });
          VersionHistorySection.getCardTimestamp(0).then((initialTimestamp) => {
            VersionHistorySection.verifyTimestampFormat(initialTimestamp);
            testData.initialTimestamp = initialTimestamp;
          });

          // Step 3: Close Version history pane.
          VersionHistorySection.clickCloseButton();

          // Steps 4-5: Set a non-default timezone for the current user.
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsPane.waitLoading();
          SettingsPane.selectSettingsTab(APPLICATION_NAMES.DEVELOPER);
          DeveloperPane.waitLoading();
          DeveloperPane.selectOption('User locale');
          UserLocale.waitLoading();
          UserLocale.configureUserLocale({
            username: testData.user.username,
            timezone: testData.newTimezone,
          });

          // Steps 6-8: Reopen the same Item and verify timestamps are rendered in the new timezone.
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          cy.reload();
          ItemRecordView.waitLoading();
          openItemVersionHistory();
          VersionHistorySection.verifyCurrentVersionCard({
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            changes: ['Material type (Edited)'],
          });
          VersionHistorySection.getCardTimestamp(0).then((updatedTimestamp) => {
            VersionHistorySection.verifyTimestampFormat(updatedTimestamp);
            expect(updatedTimestamp).to.not.equal(testData.initialTimestamp);
          });
        },
      );
    });
  });
});
