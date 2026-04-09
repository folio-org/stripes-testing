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
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C651531 Check "Version History" card is filled on Item record created via Inventory (folijet)',
        { tags: ['criticalPath', 'folijet', 'C651531'] },
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
          ItemRecordEdit.fillItemRecordFields({ materialType: MATERIAL_TYPE_NAMES.DVD });
          ItemRecordEdit.saveAndClose();
          ItemRecordView.waitLoading();
          ItemRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            isCurrent: true,
            changes: ['Material type (Edited)'],
          });
        },
      );
    });
  });
});
