import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  getReasonForTenantNotAssociatedError,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import SelectLocationsModal from '../../../../support/fragments/bulk-edit/select-locations-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
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
let loanTypeId;
let materialTypeId;
let sourceId;
const locationsInCollegeData = {};
const locationsInUniversityData = {};
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditItems.gui,
];
const folioInstance = {
  title: `C496116 folio instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  itemIds: [],
  holdingIds: [],
};
const marcInstance = {
  title: `C496116 marc instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  itemIds: [],
  holdingIds: [],
};
const instances = [folioInstance, marcInstance];
const itemUUIDsFileName = `itemUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemUUIDsFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(itemUUIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemUUIDsFileName, true);
const errorsFromCommittingFileName = BulkEditFiles.getErrorsFromCommittingFileName(
  itemUUIDsFileName,
  true,
);

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser(userPermissions).then((userProperties) => {
          user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.affiliateUserToTenant({
              tenantId: affiliation,
              userId: user.userId,
              permissions: userPermissions,
            });
          });

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
            loanTypeId = res.filter(
              (loanType) => loanType.name === LOAN_TYPE_NAMES.CAN_CIRCULATE,
            )[0].id;
          });
          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              sourceId = folioSource.id;
            })
            .then(() => {
              // create shared folio instance
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.id = createdInstanceData.instanceId;
              });
            })
            .then(() => {
              // create shared marc instance
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.id = instanceId;
              });
            })
            .then(() => {
              // create holdings in College tenant
              cy.setTenant(Affiliations.College);
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });
              InventoryInstances.getLocations({ limit: 3 }).then((resp) => {
                const locations = resp.filter((location) => location.name !== 'DCB');
                locationsInCollegeData.permanentLocation = locations[0];
                locationsInCollegeData.temporaryLocation = locations[1];

                instances.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.id,
                    permanentLocationId: locationsInCollegeData.permanentLocation.id,
                    sourceId,
                  }).then((holding) => {
                    instance.holdingIds.push(holding.id);
                  });
                  cy.wait(1000);
                });
              });
            })
            .then(() => {
              // create items with temporary location in College tenant
              instances.forEach((instance) => {
                InventoryItems.createItemViaApi({
                  barcode: instance.barcodeInCollege,
                  holdingsRecordId: instance.holdingIds[0],
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  instance.itemIds.push(item.id);
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              // create holdings in University tenant
              cy.setTenant(Affiliations.University);
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });
              InventoryInstances.getLocations({ limit: 3 }).then((resp) => {
                const locations = resp.filter((location) => location.name !== 'DCB');
                locationsInUniversityData.permanentLocation = locations[0];
                locationsInUniversityData.temporaryLocation = locations[1];

                instances.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.id,
                    permanentLocationId: locationsInUniversityData.permanentLocation.id,
                    sourceId,
                  }).then((holding) => {
                    instance.holdingIds.push(holding.id);
                  });
                  cy.wait(1000);
                });
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
                  permanentLocation: {
                    id: locationsInUniversityData.permanentLocation.id,
                    name: locationsInUniversityData.permanentLocation.name,
                  },
                  temporaryLocation: {
                    id: locationsInUniversityData.temporaryLocation.id,
                    name: locationsInUniversityData.temporaryLocation.name,
                  },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  instance.itemIds.push(item.id);
                });
                cy.wait(1000);
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

        cy.setTenant(Affiliations.University);

        instances.forEach((instance) => {
          cy.deleteItemViaApi(instance.itemIds[1]);
          cy.deleteHoldingRecordViaApi(instance.holdingIds[1]);
        });

        cy.resetTenant();
        cy.getAdminToken();

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });

        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C496116 Verify "Replace with" action for Items location in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C496116'] },
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
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
          );

          const itemInCollegeInitialHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
              value: '',
            },
          ];

          const itemInUniversityInitialHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
              value: locationsInUniversityData.permanentLocation.name,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
              value: locationsInUniversityData.temporaryLocation.name,
            },
          ];

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              instance.barcodeInCollege,
              itemInCollegeInitialHeaderValues,
            );
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              instance.barcodeInUniversity,
              itemInUniversityInitialHeaderValues,
            );
          });

          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.barcodeInCollege,
              itemInCollegeInitialHeaderValues,
            );
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.barcodeInUniversity,
              itemInUniversityInitialHeaderValues,
            );
          });

          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.selectOption('Permanent item location');
          BulkEditSearchPane.verifyInputLabel('Permanent item location');
          BulkEditActions.selectAction('Replace with');
          BulkEditActions.verifySelectLocationDisabled();
          BulkEditActions.locationLookupExists();
          BulkEditActions.clickLocationLookup();
          SelectLocationsModal.verifySelectLocationModalExists();
          SelectLocationsModal.verifyLocationLookupModalElementsInCentralTenant();
          SelectLocationsModal.verifyTenantsInAffiliationDropdown(
            tenantNames.college,
            tenantNames.university,
          );
          SelectLocationsModal.selectTenantInAffiliationDropdown(tenantNames.college);
          SelectLocationsModal.selectLocation(locationsInCollegeData.permanentLocation.name);
          SelectLocationsModal.verifySelectLocationModalExists(false);
          BulkEditActions.verifyLocationValue(
            `${locationsInCollegeData.permanentLocation.name} (${Affiliations.College})`,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.selectOption('Temporary item location', 1);
          BulkEditSearchPane.verifyInputLabel('Temporary item location', 1);
          BulkEditActions.selectAction('Replace with', 1);
          BulkEditActions.verifySelectLocationDisabled(1);
          BulkEditActions.locationLookupExists();
          BulkEditActions.clickLocationLookup(1);
          SelectLocationsModal.selectTenantInAffiliationDropdown(tenantNames.college);
          SelectLocationsModal.selectLocation(locationsInCollegeData.temporaryLocation.name);
          SelectLocationsModal.verifySelectLocationModalExists(false);
          BulkEditActions.verifyLocationValue(
            `${locationsInCollegeData.temporaryLocation.name} (${Affiliations.College})`,
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);
          BulkEditActions.verifyAreYouSureForm(4);

          const headerValuesToEdit = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
              value: locationsInCollegeData.permanentLocation.name,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
              value: locationsInCollegeData.temporaryLocation.name,
            },
          ];

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              barcode,
              headerValuesToEdit,
            );
          });

          BulkEditActions.verifyAreYouSureForm(4);
          BulkEditActions.downloadPreview();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              headerValuesToEdit,
            );
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              instance.barcodeInCollege,
              headerValuesToEdit,
            );
          });

          BulkEditSearchPane.verifyErrorLabel(4);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyReasonForError(
              getReasonForTenantNotAssociatedError(
                instance.itemIds[1],
                Affiliations.University,
                'permanent location',
              ),
            );
            BulkEditSearchPane.verifyReasonForError(
              getReasonForTenantNotAssociatedError(
                instance.itemIds[1],
                Affiliations.University,
                'temporary location',
              ),
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          instances.forEach((instance) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              instance.barcodeInCollege,
              headerValuesToEdit,
            );
          });

          BulkEditActions.downloadErrors();

          instances.forEach((instance) => {
            ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
              `ERROR,${instance.itemIds[1]},${getReasonForTenantNotAssociatedError(instance.itemIds[1], Affiliations.University, 'permanent location')}`,
              `ERROR,${instance.itemIds[1]},${getReasonForTenantNotAssociatedError(instance.itemIds[1], Affiliations.University, 'temporary location')}`,
            ]);
          });

          BulkEditFiles.verifyCSVFileRecordsNumber(errorsFromCommittingFileName, 4);

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.byKeywords(instance.title);
            InventoryInstance.openHoldings(['']);
            InventoryInstance.openItemByBarcode(instance.barcodeInCollege);
            ItemRecordView.waitLoading();
            ItemRecordView.verifyPermanentLocation(locationsInCollegeData.permanentLocation.name);
            ItemRecordView.verifyTemporaryLocation(locationsInCollegeData.temporaryLocation.name);
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.byKeywords(instance.title);
            InventoryInstance.openHoldings(['']);
            InventoryInstance.openItemByBarcode(instance.barcodeInUniversity);
            ItemRecordView.waitLoading();
            ItemRecordView.verifyPermanentLocation(
              locationsInUniversityData.permanentLocation.name,
            );
            ItemRecordView.verifyTemporaryLocation(
              locationsInUniversityData.temporaryLocation.name,
            );
          });
        },
      );
    });
  });
});
