import { ITEM_STATUS_NAMES, LOAN_TYPE_NAMES, LOCATION_NAMES } from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Item', () => {
      const randomPostfix = getRandomPostfix();
      const itemBarcodesFileName = `itemBarcodes_C656332_${randomPostfix}.csv`;
      const testData = {
        instance: {
          title: `AT_C656332_ItemVersionHistory_${randomPostfix}`,
        },
        item: {
          barcode: `AT_C656332_${randomPostfix}`,
        },
        administrativeNote: `AT_C656332 bulk edit administrative note ${randomPostfix}`,
      };

      function openInstanceDetails() {
        InventorySearchAndFilter.searchByParameter('Title (all)', testData.instance.title);
        InventoryInstances.selectInstance();
        InstanceRecordView.verifyInstanceRecordViewOpened();
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
            FileManager.createFile(
              `cypress/fixtures/${itemBarcodesFileName}`,
              testData.item.barcode,
            );

            cy.createTempUser([]).then((userProperties) => {
              testData.user = userProperties;

              cy.assignCapabilitiesToExistingUser(
                testData.user.userId,
                [],
                [
                  CapabilitySets.uiInventory,
                  CapabilitySets.uiBulkEditInventoryView,
                  CapabilitySets.uiBulkEditInventoryEdit,
                ],
              );

              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.item.barcode);
        Users.deleteViaApi(testData.user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      });

      it(
        'C656332 Check "Version history" of Item is populated after update in "Bulk edit" app (folijet)',
        { tags: ['criticalPath', 'folijet', 'C656332'] },
        () => {
          // Precondition: update the item through Bulk edit.
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(testData.item.barcode);

          BulkEditActions.openActions();
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.addItemNote('Administrative note', testData.administrativeNote);
          BulkEditActions.confirmChanges();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();

          // Open the instance from preconditions.
          TopMenuNavigation.navigateToApp('Inventory');
          InventoryInstances.waitContentLoading();
          openInstanceDetails();

          // Steps 1-2: Open the item and verify Version history contains Bulk edit changes.
          InventoryInstance.openHoldingsAccordion(testData.location.name);
          InventoryInstance.openItemByBarcode(testData.item.barcode);
          ItemRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionHistoryPane(2, false, 2);
          VersionHistorySection.verifyCurrentVersionCard({
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            changes: ['Administrative notes (Added)'],
          });
        },
      );
    });
  });
});
