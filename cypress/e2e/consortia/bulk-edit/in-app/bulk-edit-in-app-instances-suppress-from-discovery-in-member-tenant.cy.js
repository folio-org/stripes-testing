import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
const folioInstance = {
  title: `C566119 folio instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
};
const marcInstance = {
  title: `C566119 marc instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
};
const createdInstanceHrids = [];
const instances = [folioInstance, marcInstance];
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditInstances.gui,
          ]);

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ query: 'name="DCB"' }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            materialTypeId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              sourceId = folioSource.id;
            })
            .then(() => {
              // create folio instance in College tenant
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.uuid = createdInstanceData.instanceId;

                cy.getInstanceById(folioInstance.uuid).then((instanceData) => {
                  createdInstanceHrids.push(instanceData.hrid);
                  cy.wait(500);
                });
              });
            })
            .then(() => {
              // create marc instance in College tenant
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.uuid = instanceId;

                cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
                  createdInstanceHrids.push(instanceData.hrid);
                  cy.wait(500);
                });
              });
            })
            .then(() => {
              // create holdings in College tenant
              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.uuid,
                  permanentLocationId: locationId,
                  sourceId,
                }).then((holding) => {
                  instance.holdingId = holding.id;
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              // create items in College tenant
              instances.forEach((instance) => {
                InventoryItems.createItemViaApi({
                  barcode: instance.barcodeInCollege,
                  holdingsRecordId: instance.holdingId,
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                `${folioInstance.uuid}\n${marcInstance.uuid}`,
              );
            });

          cy.resetTenant();
          cy.login(user.username, user.password);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);

        instances.forEach((instance) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.uuid);
        });

        cy.resetTenant();
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C566119 Verify "Suppress from discovery" action for Instances in Member tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C566119'] },
        () => {
          const suppressFromDiscoveryParams = [
            { initialValue: 'false', action: 'Set true', newValue: 'true', newValueInFile: true },
            { initialValue: 'true', action: 'Set false', newValue: 'false', newValueInFile: false },
          ];

          suppressFromDiscoveryParams.forEach((suppressFromDiscoveryParam) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
            BulkEditSearchPane.clickToBulkEditMainButton();
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
              'Instance',
              'Instance UUIDs',
            );
            BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
            BulkEditSearchPane.waitFileUploading();
            BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
            BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
            BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

            createdInstanceHrids.forEach((instanceHrid) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instanceHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
                instanceHrid,
              );
            });

            BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
            BulkEditSearchPane.verifyNextPaginationButtonDisabled();
            BulkEditActions.openActions();
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            );
            BulkEditSearchPane.verifyResultColumnTitles(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            );
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();

            createdInstanceHrids.forEach((hrid) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                suppressFromDiscoveryParam.initialValue,
              );
            });

            BulkEditActions.openStartBulkEditInstanceForm();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();
            BulkEditActions.selectOption('Suppress from discovery');
            BulkEditActions.verifyOptionSelected('Suppress from discovery');
            BulkEditActions.selectAction(suppressFromDiscoveryParam.action);
            BulkEditActions.verifyActionSelected(suppressFromDiscoveryParam.action);

            if (suppressFromDiscoveryParam.newValue === 'false') {
              BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(false);
            } else {
              BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(true);
            }

            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
            BulkEditActions.verifyAreYouSureForm(2);

            createdInstanceHrids.forEach((instanceHrid) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                instanceHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                suppressFromDiscoveryParam.newValue,
              );
            });

            BulkEditActions.downloadPreview();

            createdInstanceHrids.forEach((instanceHrid) => {
              BulkEditFiles.verifyValueInRowByUUID(
                previewFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
                instanceHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                suppressFromDiscoveryParam.newValueInFile,
              );
            });

            BulkEditActions.commitChanges();
            BulkEditSearchPane.waitFileUploading();
            BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
            BulkEditActions.verifySuccessBanner('2');
            BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

            createdInstanceHrids.forEach((instanceHrid) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
                instanceHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                suppressFromDiscoveryParam.newValue,
              );
            });

            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            createdInstanceHrids.forEach((instanceHrid) => {
              BulkEditFiles.verifyValueInRowByUUID(
                changedRecordsFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
                instanceHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                suppressFromDiscoveryParam.newValueInFile,
              );
            });
            instances.forEach((instance) => {
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventorySearchAndFilter.waitLoading();
              InventorySearchAndFilter.searchInstanceByTitle(instance.title);
              InventoryInstances.selectInstance();
              InventoryInstance.verifyInstanceTitle(instance.title);

              if (suppressFromDiscoveryParam.newValue === 'true') {
                InstanceRecordView.verifyMarkAsSuppressedFromDiscovery();
              } else {
                InstanceRecordView.verifyNotMarkAsStaffSuppressed();
              }

              InventorySearchAndFilter.selectViewHoldings();
              HoldingsRecordView.checkHoldingRecordViewOpened();
              HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
              HoldingsRecordView.close();
              InventoryInstance.openHoldings(['']);
              InventoryInstance.openItemByBarcode(instance.barcodeInCollege);
              ItemRecordView.waitLoading();
              ItemRecordView.suppressedAsDiscoveryIsPresent();
              ItemRecordView.closeDetailView();
              InventorySearchAndFilter.resetAll();
            });
          });
        },
      );
    });
  });
});
