import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import QueryModal, {
  QUERY_OPERATIONS,
  itemFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { getLongDelay } from '../../../../support/utils/cypressTools';

let user;
let instanceTypeId;
let collegeLocationId;
let collegeMaterialTypeId;
let collegeLoanTypeId;
let holdingSource;
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewQueryFileName;
let changedRecordsQueryFileName;
let previewFileName;
let changedRecordsFileName;
let downloadedFileNameForUpload;
const postfix = randomFourDigitNumber();
const suppressFromDiscovery = 'Suppress from discovery';
const actions = {
  setFalse: 'Set false',
  setTrue: 'Set true',
};
const folioInstance = {
  title: `AT_C566174_${postfix}_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C566174_${postfix}_MarcInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
};
const instances = [folioInstance, marcInstance];

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
          permissions.bulkEditQueryView.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              // create folio instance
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
              // create marc instance
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.uuid = instanceId;
              });
            })
            .then(() => {
              // create holdings in member tenant
              cy.getLocations({ limit: 1 }).then((res) => {
                collegeLocationId = res.id;
              });
              cy.getLoanTypes({ limit: 1 }).then((res) => {
                collegeLoanTypeId = res[0].id;
              });
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                collegeMaterialTypeId = res.id;
              });
              InventoryHoldings.getHoldingsFolioSource()
                .then((folioSource) => {
                  holdingSource = folioSource.id;
                })
                .then(() => {
                  instances.forEach((instance) => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instance.uuid,
                      permanentLocationId: collegeLocationId,
                      sourceId: holdingSource,
                    }).then((holding) => {
                      instance.holdingUuid = holding.id;
                    });
                  });
                });
            })
            .then(() => {
              // create items in member tenant
              instances.forEach((instance) => {
                InventoryItems.createItemViaApi({
                  barcode: instance.itemBarcode,
                  holdingsRecordId: instance.holdingUuid,
                  materialType: { id: collegeMaterialTypeId },
                  permanentLoanType: { id: collegeLoanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  instance.itemUuid = item.id;
                  instance.itemHrid = item.hrid;
                });
              });
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              BulkEditSearchPane.openQuerySearch();
              BulkEditSearchPane.checkItemsRadio();
              BulkEditSearchPane.clickBuildQueryButton();
              QueryModal.verify();
              QueryModal.selectField(itemFieldValues.itemDiscoverySuppress);
              QueryModal.verifySelectedField(itemFieldValues.itemDiscoverySuppress);
              QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
              QueryModal.chooseValueSelect('True');
              QueryModal.addNewRow();
              QueryModal.selectField(itemFieldValues.instanceTitle, 1);
              QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
              QueryModal.fillInValueTextfield(`AT_C566174_${postfix}`, 1);
              cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
              cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
              QueryModal.clickTestQuery();
              QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
            });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user.userId);

        instances.forEach((instance) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.uuid);
        });

        FileManager.deleteFile(`cypress/fixtures/downloaded-${identifiersQueryFilename}`);
        FileManager.deleteFileFromDownloadsByMask(
          identifiersQueryFilename,
          matchedRecordsQueryFileName,
          previewQueryFileName,
          changedRecordsQueryFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C566174 Verify "Suppress from discovery" action for Items in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566174'] },
        () => {
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            identifiersQueryFilename = `Query-${interceptedUuid}.csv`;
            matchedRecordsQueryFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;
            previewQueryFileName = `*-Updates-Preview-CSV-Query-${interceptedUuid}.csv`;
            changedRecordsQueryFileName = `*-Changed-Records-CSV-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 item');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(items.discovery_suppress != true) AND (instances.title starts with AT_C566174_${postfix})`,
            );

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instance.itemHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                instance.itemBarcode,
              );
            });

            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
            BulkEditActions.downloadMatchedResults();

            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                instance.itemUuid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                instance.itemBarcode,
              );
            });

            BulkEditActions.openInAppStartBulkEditFrom();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();
            BulkEditActions.verifyCancelButtonDisabled(false);
            BulkEditActions.verifyConfirmButtonDisabled(true);
            BulkEditActions.selectOption(suppressFromDiscovery);
            BulkEditSearchPane.verifyInputLabel(suppressFromDiscovery);
            BulkEditActions.verifyTheActionOptions(Object.values(actions));
            BulkEditActions.selectSecondAction(actions.setTrue);
            BulkEditActions.verifySecondActionSelected(actions.setTrue);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                instance.itemHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
                'true',
              );
            });

            BulkEditActions.verifyAreYouSureForm(2);
            BulkEditActions.downloadPreview();

            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                previewQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                instance.itemUuid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
                true,
              );
            });

            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(2);

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
                instance.itemHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
                'true',
              );
            });

            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                changedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                instance.itemUuid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
                true,
              );
            });

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToItem();

            instances.forEach((instance) => {
              InventorySearchAndFilter.searchByParameter('Barcode', instance.itemBarcode);
              ItemRecordView.waitLoading();
              ItemRecordView.suppressedAsDiscoveryIsPresent();
              ItemRecordView.closeDetailView();
              InventorySearchAndFilter.resetAll();
            });

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.verifyLogsPane();
            BulkEditLogs.checkItemsCheckbox();
            BulkEditLogs.verifyCheckboxIsSelected('ITEM', true);
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.downloadQueryIdentifiers();
            ExportFile.verifyFileIncludes(identifiersQueryFilename, [
              folioInstance.itemUuid,
              marcInstance.itemUuid,
            ]);
            BulkEditSearchPane.openIdentifierSearch();
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
            BulkEditSearchPane.uploadRecentlyDownloadedFile(identifiersQueryFilename).then(
              (changedFileName) => {
                downloadedFileNameForUpload = changedFileName;
                previewFileName = `*-Updates-Preview-CSV-${downloadedFileNameForUpload}`;
                changedRecordsFileName = `*-Changed-Records-CSV-${downloadedFileNameForUpload}`;
                BulkEditActions.openActions();
                BulkEditSearchPane.changeShowColumnCheckbox(
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
                );

                instances.forEach((instance) => {
                  BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                    instance.itemHrid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
                    'true',
                  );
                });

                BulkEditActions.openInAppStartBulkEditFrom();
                BulkEditActions.selectOption(suppressFromDiscovery);
                BulkEditSearchPane.verifyInputLabel(suppressFromDiscovery);
                BulkEditActions.selectSecondAction(actions.setFalse);
                BulkEditActions.verifySecondActionSelected(actions.setFalse);
                BulkEditActions.verifyConfirmButtonDisabled(false);
                BulkEditActions.confirmChanges();
                BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

                instances.forEach((instance) => {
                  BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                    instance.itemHrid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
                    'false',
                  );
                });

                BulkEditActions.verifyAreYouSureForm(2);
                BulkEditActions.downloadPreview();

                instances.forEach((instance) => {
                  BulkEditFiles.verifyValueInRowByUUID(
                    previewFileName,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                    instance.itemUuid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
                    false,
                  );
                });

                BulkEditActions.commitChanges();
                BulkEditActions.verifySuccessBanner(2);

                instances.forEach((instance) => {
                  BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
                    instance.itemHrid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
                    'false',
                  );
                });

                BulkEditActions.openActions();
                BulkEditActions.downloadChangedCSV();

                instances.forEach((instance) => {
                  BulkEditFiles.verifyValueInRowByUUID(
                    changedRecordsFileName,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                    instance.itemUuid,
                    BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
                    false,
                  );
                });

                TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
                InventorySearchAndFilter.switchToItem();

                instances.forEach((instance) => {
                  InventorySearchAndFilter.searchByParameter('Barcode', instance.itemBarcode);
                  ItemRecordView.waitLoading();
                  ItemRecordView.suppressedAsDiscoveryIsAbsent();
                  ItemRecordView.closeDetailView();
                  InventorySearchAndFilter.resetAll();
                });
              },
            );
          });
        },
      );
    });
  });
});
