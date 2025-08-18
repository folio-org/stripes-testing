import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import LoanTypes from '../../../../support/fragments/settings/inventory/items/loanTypes';
import LoanTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/items/loanTypesConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
let centralSharedLoanTypeData;
const folioInstance = {
  title: `C496151 folio instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  itemIds: [],
  holdingIds: [],
};
const marcInstance = {
  title: `C496151 marc instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  itemIds: [],
  holdingIds: [],
};
const centralSharedLoanType = {
  payload: {
    name: `C496151 Central shared loan type ${getRandomPostfix()}`,
  },
};
const collegeItemLoanType = {
  name: `C496151 College loan type ${getRandomPostfix()}`,
};
const instances = [folioInstance, marcInstance];
const itemUUIDsFileName = `itemUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(itemUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemUUIDsFileName);

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
        ]).then((userProperties) => {
          user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.assignAffiliationToUser(affiliation, user.userId);
            cy.setTenant(affiliation);
            cy.assignPermissionsToExistingUser(user.userId, [
              permissions.bulkEditEdit.gui,
              permissions.uiInventoryViewCreateEditItems.gui,
            ]);
            cy.resetTenant();
          });

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ query: 'name="DCB"' }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
            loanTypeId = res[0].id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });
          LoanTypesConsortiumManager.createViaApi(centralSharedLoanType).then((newLoanType) => {
            centralSharedLoanTypeData = newLoanType;
          });

          cy.setTenant(Affiliations.College);
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            materialTypeId = res.id;
          });
          // create local item loan type in College
          LoanTypes.createLoanTypesViaApi(collegeItemLoanType)
            .then((typeId) => {
              collegeItemLoanType.id = typeId;
            })
            .then(() => {
              cy.resetTenant();
              // create shared folio instance
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.uuid = createdInstanceData.instanceId;
              });
            })
            .then(() => {
              // create shared marc instance
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.uuid = instanceId;
              });
            })
            .then(() => {
              // create holdings in College tenant
              cy.setTenant(Affiliations.College);

              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.uuid,
                  permanentLocationId: locationId,
                  sourceId,
                }).then((holding) => {
                  instance.holdingIds.push(holding.id);
                  cy.wait(1000);
                });
              });
            })
            .then(() => {
              // create items in College tenant
              instances.forEach((instance) => {
                InventoryItems.createItemViaApi({
                  barcode: instance.barcodeInCollege,
                  holdingsRecordId: instance.holdingIds[0],
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  temporaryLoanType: { id: collegeItemLoanType.id },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  instance.itemIds.push(item.id);
                  cy.wait(1000);
                });
              });
            })
            .then(() => {
              // create holdings in University tenant
              cy.setTenant(Affiliations.University);
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });

              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.uuid,
                  permanentLocationId: locationId,
                  sourceId,
                }).then((holding) => {
                  instance.holdingIds.push(holding.id);
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              // create items in University tenant
              instances.forEach((instance) => {
                InventoryItems.createItemViaApi({
                  barcode: instance.barcodeInUniversity,
                  holdingsRecordId: instance.holdingIds[1],
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  temporaryLoanType: { id: centralSharedLoanTypeData.settingId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  instance.itemIds.push(item.id);
                  cy.wait(1000);
                });
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${itemUUIDsFileName}`,
                `${folioInstance.itemIds.join('\n')}\n${marcInstance.itemIds.join('\n')}`,
              );
            });

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);

        instances.forEach((instance) => {
          cy.deleteItemViaApi(instance.itemIds[0]);
          cy.deleteHoldingRecordViaApi(instance.holdingIds[0]);
        });

        LoanTypes.deleteLoanTypesViaApi(collegeItemLoanType.id);

        cy.setTenant(Affiliations.University);

        instances.forEach((instance) => {
          cy.deleteItemViaApi(instance.itemIds[1]);
          cy.deleteHoldingRecordViaApi(instance.holdingIds[1]);
        });

        cy.resetTenant();
        cy.getAdminToken();

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        LoanTypesConsortiumManager.deleteViaApi(centralSharedLoanTypeData);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C496151 Verify "Clear" action for Items loan type in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C496151'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
          BulkEditSearchPane.uploadFile(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('4 item');
          BulkEditSearchPane.verifyFileNameHeadLine(itemUUIDsFileName);

          const itemBarcodes = [
            folioInstance.barcodeInCollege,
            folioInstance.barcodeInUniversity,
            marcInstance.barcodeInCollege,
            marcInstance.barcodeInUniversity,
          ];
          const collegeItemBarcodes = [
            folioInstance.barcodeInCollege,
            marcInstance.barcodeInCollege,
          ];
          const universityItemBarcodes = [
            folioInstance.barcodeInUniversity,
            marcInstance.barcodeInUniversity,
          ];

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
            );
          });

          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
          );

          const collegeItemInitialHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
              value: collegeItemLoanType.name,
            },
          ];
          const universityItemInitialHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
              value: centralSharedLoanType.payload.name,
            },
          ];

          collegeItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              barcode,
              collegeItemInitialHeaderValues,
            );
          });
          universityItemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              barcode,
              universityItemInitialHeaderValues,
            );
          });

          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          collegeItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              collegeItemInitialHeaderValues,
            );
          });
          universityItemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              universityItemInitialHeaderValues,
            );
          });

          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.clearTemporaryLoanType();
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          const headerValuesEdited = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
              value: '',
            },
          ];

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              barcode,
              headerValuesEdited,
            );
          });

          BulkEditActions.verifyAreYouSureForm(4);
          BulkEditActions.downloadPreview();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              headerValuesEdited,
            );
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(4);

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              barcode,
              headerValuesEdited,
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              headerValuesEdited,
            );
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.byKeywords(instance.title);
            InventoryInstance.openHoldings(['']);
            InventoryInstance.openItemByBarcode(instance.barcodeInCollege);
            ItemRecordView.waitLoading();
            ItemRecordView.verifyTemporaryLoanType('No value set-');
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.byKeywords(instance.title);
            InventoryInstance.openHoldings(['']);
            InventoryInstance.openItemByBarcode(instance.barcodeInUniversity);
            ItemRecordView.waitLoading();
            ItemRecordView.verifyTemporaryLoanType('No value set-');
          });
        },
      );
    });
  });
});
