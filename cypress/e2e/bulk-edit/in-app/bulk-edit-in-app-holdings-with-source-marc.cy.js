import {
  APPLICATION_NAMES,
  LOAN_TYPE_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  LOCATION_NAMES,
} from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';

let user;
let location;
let materialTypeId;
let loanTypeId;
const instanceFolio = {
  instanceTitle: `C435917 folio instance-${getRandomPostfix()}`,
};
const instanceMarc = {
  instanceTitle: `C435917 first marc instance-${getRandomPostfix()}`,
};
const instanceMarcWithItem = {
  instanceTitle: `C435917 second marc instance-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const actionsToSelect = {
  setTrue: 'Set true',
};
const validInstanceUUIDsFileName = `validInstanceUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(validInstanceUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(validInstanceUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(validInstanceUUIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditView.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getAdminToken();
        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypes) => {
            instanceFolio.instanceTypeId = instanceTypes[0].id;

            cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
              location = res;
            });
            cy.getDefaultMaterialType().then((res) => {
              materialTypeId = res.id;
            });
            cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
              loanTypeId = res[0].id;
            });

            // create FOLIO instance without Holdings
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceFolio.instanceTypeId,
                title: instanceFolio.instanceTitle,
              },
            }).then((instanceData) => {
              instanceFolio.uuid = instanceData.instanceId;

              cy.getInstanceById(instanceData.instanceId).then((folioInstanceData) => {
                instanceFolio.hrid = folioInstanceData.hrid;
              });
            });
          })
          .then(() => {
            // create MARC instance with Holding and without Items
            cy.createSimpleMarcBibViaAPI(instanceMarc.instanceTitle).then((instanceId) => {
              instanceMarc.uuid = instanceId;

              cy.getInstanceById(instanceId).then((instanceData) => {
                instanceMarc.hrid = instanceData.hrid;

                cy.createSimpleMarcHoldingsViaAPI(
                  instanceData.id,
                  instanceData.hrid,
                  location.code,
                );
              });
            });
          })
          .then(() => {
            // create MARC instance with Holding and Item
            cy.createSimpleMarcBibViaAPI(instanceMarcWithItem.instanceTitle).then((instanceId) => {
              instanceMarcWithItem.uuid = instanceId;

              cy.getInstanceById(instanceId).then((instanceData) => {
                instanceMarcWithItem.hrid = instanceData.hrid;

                cy.createSimpleMarcHoldingsViaAPI(
                  instanceData.id,
                  instanceData.hrid,
                  location.code,
                ).then((holdingId) => {
                  cy.createItem({
                    holdingsRecordId: holdingId,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: 'Available' },
                    barcode: instanceMarcWithItem.itemBarcode,
                  });
                });
              });
            });
          })
          .then(() => {
            FileManager.createFile(
              `cypress/fixtures/${validInstanceUUIDsFileName}`,
              `${instanceFolio.uuid}\n${instanceMarc.uuid}\n${instanceMarcWithItem.uuid}`,
            );
          });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      [instanceFolio.uuid, instanceMarc.uuid, instanceMarcWithItem.uuid].forEach((instanceId) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      });
      FileManager.deleteFile(`cypress/fixtures/${validInstanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C435917 Verify Holdings with source MARC are NOT modified by the "Suppress from discovery" option (firebird)',
      { tags: ['criticalPath', 'firebird', 'C435917'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instances', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(validInstanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneTitleFileName(validInstanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('3 instance');
        BulkEditSearchPane.verifyFileNameHeadLine(validInstanceUUIDsFileName);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instanceFolio.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          instanceFolio.hrid,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instanceMarc.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          instanceMarc.hrid,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instanceMarcWithItem.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          instanceMarcWithItem.hrid,
        );
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        const createdRecordsUUIDs = [
          instanceFolio.uuid,
          instanceMarc.uuid,
          instanceMarcWithItem.uuid,
        ];

        createdRecordsUUIDs.forEach((uuid) => {
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            uuid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            uuid,
          );
        });

        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.selectOption('Suppress from discovery');
        BulkEditActions.selectAction(actionsToSelect.setTrue);
        BulkEditActions.verifyActionSelected(actionsToSelect.setTrue);
        BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(true);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(3);

        const createdRecordsHRIDs = [
          instanceFolio.hrid,
          instanceMarc.hrid,
          instanceMarcWithItem.hrid,
        ];

        createdRecordsHRIDs.forEach((hrid) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            'true',
          );
        });

        BulkEditActions.verifyKeepEditingButtonDisabled(false);
        BulkEditActions.verifyDownloadPreviewButtonDisabled(false);
        BulkEditActions.isCommitButtonDisabled(false);
        BulkEditActions.downloadPreview();

        createdRecordsUUIDs.forEach((uuid) => {
          BulkEditFiles.verifyValueInRowByUUID(
            previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            uuid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            true,
          );
        });

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(3);
        BulkEditSearchPane.verifyPaneRecordsChangedCount('3 instance');
        BulkEditSearchPane.verifyPaneTitleFileName(validInstanceUUIDsFileName);
        BulkEditSearchPane.verifyFileNameHeadLine(validInstanceUUIDsFileName);

        createdRecordsHRIDs.forEach((hrid) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            'true',
          );
        });

        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        createdRecordsUUIDs.forEach((uuid) => {
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            uuid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            true,
          );
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByHRID(instanceFolio.hrid);
        InventoryInstances.selectInstance();
        InventoryInstance.verifyInstanceTitle(instanceFolio.instanceTitle);
        InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();

        InventorySearchAndFilter.searchInstanceByHRID(instanceMarc.hrid);
        InventoryInstances.selectInstance();
        InventoryInstance.verifyInstanceTitle(instanceMarc.instanceTitle);
        InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        cy.wait(1000);
        HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();
        HoldingsRecordView.close();

        InventorySearchAndFilter.searchInstanceByHRID(instanceMarcWithItem.hrid);
        InventoryInstances.selectInstance();
        InventoryInstance.verifyInstanceTitle(instanceMarcWithItem.instanceTitle);
        InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        cy.wait(1000);
        HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();
        HoldingsRecordView.close();
        InventoryInstance.openHoldingsAccordion(LOCATION_NAMES.MAIN_LIBRARY_UI);
        InventoryInstance.openItemByBarcode(instanceMarcWithItem.itemBarcode);
        cy.wait(1000);
        ItemRecordView.suppressedAsDiscoveryIsAbsent();
      },
    );
  });
});
