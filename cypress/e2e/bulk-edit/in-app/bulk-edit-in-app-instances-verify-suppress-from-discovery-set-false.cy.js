import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  instanceIdentifiers,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import {
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../support/constants';

let user;
let instanceTypeId;
let holdingTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
const folioInstanceTitles = {
  instance: `C434145 folio instance-${getRandomPostfix()}`,
  instanceWithHolding: `C434145 folio instance with holding-${getRandomPostfix()}`,
  instanceWithHoldingAndItem: `C434145 folio instance with holding and item-${getRandomPostfix()}`,
};
const marcInstanceTitles = {
  instance: `C434145 marc instance-${getRandomPostfix()}`,
  instanceWithHolding: `C434145 marc instance with holding-${getRandomPostfix()}`,
  instanceWithHoldingAndItem: `C434145 marc instance with holding and item-${getRandomPostfix()}`,
};
const itemBarcodes = [getRandomPostfix(), getRandomPostfix()];
const optionToSelect = {
  suppressFromDiscovery: 'Suppress from discovery',
};
const actionOptions = {
  setFalse: 'Set false',
  setTrue: 'Set true',
};
const invalidInstanceIds = [];
const createdInstanceIds = [];
const createdInstanceHrids = [];
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName);
const errorsFromMatchingFileName = BulkEditFiles.getErrorsFromMatchingFileName(
  instanceUUIDsFileName,
  true,
);

// generate invalid instance ids
for (let i = 1; i <= 5; i++) {
  invalidInstanceIds.push(uuid());
}

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.bulkEditView.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instanceTypeId = instanceTypeData[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          holdingTypeId = res[0].id;
        });
        cy.getLocations({ limit: 1 }).then((res) => {
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
            // folio instance without holding
            cy.createInstance({
              instance: {
                instanceTypeId,
                title: folioInstanceTitles.instance,
              },
            }).then((instanceId) => {
              createdInstanceIds.push(instanceId);
              cy.wait(1000);

              cy.getInstanceById(instanceId).then((instanceData) => {
                createdInstanceHrids.push(instanceData.hrid);
                cy.wait(500);
              });
            });
          })
          .then(() => {
            // folio instance with holding
            cy.createInstance({
              instance: {
                instanceTypeId,
                title: folioInstanceTitles.instanceWithHolding,
              },
              holdings: [
                {
                  holdingsTypeId: holdingTypeId,
                  permanentLocationId: locationId,
                  sourceId,
                },
              ],
            }).then((instanceId) => {
              createdInstanceIds.push(instanceId);
              cy.wait(1000);

              cy.getInstanceById(instanceId).then((instanceData) => {
                createdInstanceHrids.push(instanceData.hrid);
                cy.wait(500);
              });
            });
          })
          .then(() => {
            // folio instance with holding and item
            cy.createInstance({
              instance: {
                instanceTypeId,
                title: folioInstanceTitles.instanceWithHoldingAndItem,
              },
              holdings: [
                {
                  holdingsTypeId: holdingTypeId,
                  permanentLocationId: locationId,
                  sourceId,
                },
              ],
              items: [
                [
                  {
                    barcode: itemBarcodes[0],
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: loanTypeId },
                    materialType: { id: materialTypeId },
                  },
                ],
              ],
            }).then((instanceId) => {
              createdInstanceIds.push(instanceId);
              cy.wait(1000);

              cy.getInstanceById(instanceId).then((instanceData) => {
                createdInstanceHrids.push(instanceData.hrid);
                cy.wait(500);
              });
            });
          })
          .then(() => {
            // marc instance without holding
            cy.createSimpleMarcBibViaAPI(marcInstanceTitles.instance).then((instanceId) => {
              createdInstanceIds.push(instanceId);

              cy.getInstanceById(instanceId).then((instanceData) => {
                createdInstanceHrids.push(instanceData.hrid);
              });
            });
          })
          .then(() => {
            // marc instance with holding
            cy.createSimpleMarcBibViaAPI(marcInstanceTitles.instanceWithHolding).then(
              (instanceId) => {
                createdInstanceIds.push(instanceId);

                cy.getInstanceById(instanceId).then((instanceData) => {
                  createdInstanceHrids.push(instanceData.hrid);

                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instanceData.id,
                    permanentLocationId: locationId,
                    sourceId,
                  });
                });
              },
            );
          })
          .then(() => {
            // marc instance with holding and item
            cy.createSimpleMarcBibViaAPI(marcInstanceTitles.instanceWithHoldingAndItem).then(
              (instanceId) => {
                createdInstanceIds.push(instanceId);

                cy.getInstanceById(instanceId).then((instanceData) => {
                  createdInstanceHrids.push(instanceData.hrid);

                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instanceData.id,
                    permanentLocationId: locationId,
                    sourceId,
                  }).then((holdingData) => {
                    cy.createItem({
                      holdingsRecordId: holdingData.id,
                      materialType: { id: materialTypeId },
                      permanentLoanType: { id: loanTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      barcode: itemBarcodes[1],
                    });
                  });
                });
              },
            );
          })
          .then(() => {
            createdInstanceIds.forEach((instanceId) => {
              cy.getInstanceById(instanceId).then((body) => {
                body.discoverySuppress = true;
                cy.updateInstance(body);
              });
            });
          })
          .then(() => {
            FileManager.createFile(
              `cypress/fixtures/${instanceUUIDsFileName}`,
              `${createdInstanceIds.join('\n')}\n${invalidInstanceIds.join('\n')}`,
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
      createdInstanceIds.forEach((instanceId) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      });
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        errorsFromMatchingFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C434145 Verify "Suppress from discovery" option is set False when Instances are suppressed from discovery, Holdings and items are not suppressed (firebird)',
      { tags: ['criticalPath', 'firebird', 'C434145'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.verifyRecordIdentifiers(instanceIdentifiers);
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('6 instance');
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

        createdInstanceHrids.forEach((instanceHrid) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instanceHrid,
          );
        });

        BulkEditSearchPane.verifyErrorLabel(5);
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        createdInstanceIds.forEach((instanceId) => {
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [instanceId]);
        });

        BulkEditActions.downloadErrors();

        invalidInstanceIds.forEach((invalidInstanceId) => {
          ExportFile.verifyFileIncludes(errorsFromMatchingFileName, [invalidInstanceId]);
        });

        BulkEditActions.openStartBulkEditInstanceForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.selectOption(optionToSelect.suppressFromDiscovery);
        BulkEditActions.verifyOptionSelected(optionToSelect.suppressFromDiscovery);
        BulkEditActions.verifyTheActionOptions(Object.values(actionOptions));
        BulkEditActions.selectAction(actionOptions.setTrue);
        BulkEditActions.verifyActionSelected(actionOptions.setTrue);
        BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(true);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(6);
        BulkEditActions.verifyAreYouSureForm(6);

        createdInstanceHrids.forEach((instanceHrid) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            'true',
          );
        });

        BulkEditActions.downloadPreview();

        createdInstanceIds.forEach((instanceId) => {
          BulkEditFiles.verifyValueInRowByUUID(
            previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            instanceId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            true,
          );
        });

        BulkEditActions.closeAreYouSureForm();
        BulkEditActions.verifyAreYouSureFormAbsents();
        BulkEditActions.selectAction(actionOptions.setFalse);
        BulkEditActions.verifyActionSelected(actionOptions.setFalse);
        BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(false);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(6);
        BulkEditActions.verifyAreYouSureForm(6);

        createdInstanceHrids.forEach((instanceHrid) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            'false',
          );
        });

        BulkEditActions.downloadPreview();

        createdInstanceIds.forEach((instanceId) => {
          BulkEditFiles.verifyValueInRowByUUID(
            previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            instanceId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            false,
          );
        });

        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
        BulkEditActions.verifySuccessBanner('6');
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

        createdInstanceHrids.forEach((instanceHrid) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            instanceHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            'false',
          );
        });

        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        createdInstanceIds.forEach((instanceId) => {
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            instanceId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            false,
          );
        });
        createdInstanceHrids.forEach((instanceHrid) => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InventoryInstances.selectInstance();
          cy.wait(1000);
          InstanceRecordView.verifyNotMarkAsStaffSuppressed();
        });

        const instanceTitlesWithHolding = [
          folioInstanceTitles.instanceWithHolding,
          folioInstanceTitles.instanceWithHoldingAndItem,
          marcInstanceTitles.instanceWithHolding,
          marcInstanceTitles.instanceWithHoldingAndItem,
        ];

        instanceTitlesWithHolding.forEach((instanceTitle) => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
          InventoryInstances.selectInstance();
          InventoryInstance.verifyInstanceTitle(instanceTitle);
          InventorySearchAndFilter.selectViewHoldings();
          HoldingsRecordView.waitLoading();
          cy.wait(1000);
          HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();

        itemBarcodes.forEach((itemBarcode) => {
          InventorySearchAndFilter.searchByParameter('Barcode', itemBarcode);
          ItemRecordView.waitLoading();
          cy.wait(1000);
          ItemRecordView.suppressedAsDiscoveryIsAbsent();
          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.resetAll();
        });
      },
    );
  });
});
