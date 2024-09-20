import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';

let user;
let instanceTypeId;
let collegeLocation;
let collegeMaterialTypeId;
let collegeLoanTypeId;
let holdingSource;
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${holdingUUIDsFileName}`;
const previewFileName = `*-Updates-Preview-${holdingUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${holdingUUIDsFileName}`;
const suppressFromDiscovery = 'Suppress from discovery';
const actions = {
  setTrue: 'Set true',
  setFalse: 'Set false',
};
const folioInstance = {
  title: `C496118 folio instance testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {
  title: `C496118 marc instance testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const leader = QickMarcEditor.defaultValidLdr;
const getMarcBibFields = (intsanceTitle) => {
  return [
    {
      tag: '008',
      content: QickMarcEditor.defaultValid008Values,
    },
    {
      tag: '245',
      content: `$a ${intsanceTitle}`,
      indicators: ['1', '1'],
    },
  ];
};

describe('Bulk-edit', () => {
  describe('In-app', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditHoldings.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditHoldings.gui,
            permissions.uiInventoryViewCreateEditItems.gui,
          ]);

          cy.resetTenant();

          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
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
              cy.createMarcBibliographicViaAPI(leader, getMarcBibFields(marcInstance.title)).then(
                (instanceId) => {
                  marcInstance.uuid = instanceId;
                },
              );
            })
            .then(() => {
              // create holdings in member tenant
              cy.setTenant(Affiliations.College);
              cy.getCollegeAdminToken();

              const collegeLocationData = Locations.getDefaultLocation({
                servicePointId: ServicePoints.getDefaultServicePoint().id,
              }).location;
              Locations.createViaApi(collegeLocationData).then((location) => {
                collegeLocation = location;
              });
              InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' })
                .then((holdingSources) => {
                  holdingSource = holdingSources[0].id;
                })
                .then(() => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: folioInstance.uuid,
                    permanentLocationId: collegeLocation.id,
                    sourceId: holdingSource,
                  }).then((holding) => {
                    folioInstance.holdingUuid = holding.id;

                    cy.getHoldings({
                      limit: 1,
                      query: `"instanceId"="${folioInstance.uuid}"`,
                    }).then((holdings) => {
                      folioInstance.holdingHrid = holdings[0].hrid;
                    });
                  });

                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: marcInstance.uuid,
                    permanentLocationId: collegeLocation.id,
                    sourceId: holdingSource,
                  }).then((holding) => {
                    marcInstance.holdingUuid = holding.id;

                    cy.getHoldings({
                      limit: 1,
                      query: `"instanceId"="${marcInstance.uuid}"`,
                    }).then((holdings) => {
                      marcInstance.holdingHrid = holdings[0].hrid;
                    });
                  });
                });
            })
            .then(() => {
              // create items in member tenant
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                collegeMaterialTypeId = res.id;
              });
              cy.getLoanTypes({ limit: 1 }).then((res) => {
                collegeLoanTypeId = res[0].id;
              });
            })
            .then(() => {
              InventoryItems.createItemViaApi({
                barcode: folioInstance.itemBarcode,
                holdingsRecordId: folioInstance.holdingUuid,
                materialType: { id: collegeMaterialTypeId },
                permanentLoanType: { id: collegeLoanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                folioInstance.itemuuid = item.id;
                // instance.itemHrids.push(item.hrid);
              });

              InventoryItems.createItemViaApi({
                barcode: marcInstance.itemBarcode,
                holdingsRecordId: marcInstance.holdingUuid,
                materialType: { id: collegeMaterialTypeId },
                permanentLoanType: { id: collegeLoanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                marcInstance.itemuuid = item.id;
                // instance.itemHrids.push(item.hrid);
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${holdingUUIDsFileName}`,
                `${folioInstance.holdingUuid}\r\n${marcInstance.holdingUuid}`,
              );
            });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          // ConsortiumManager.checkCurrentTenantInTopMenuRegardlessAssignedServicePoint(
          //   tenantNames.central,
          // );
        });
      });

      after('delete test data', () => {
        cy.setTenant(Affiliations.College);
        cy.getCollegeAdminToken();
        InventoryItems.deleteItemViaApi(marcInstance.itemuuid);
        InventoryItems.deleteItemViaApi(folioInstance.itemuuid);
        InventoryHoldings.deleteHoldingRecordViaApi(marcInstance.holdingUuid);
        InventoryHoldings.deleteHoldingRecordViaApi(folioInstance.holdingUuid);
        Locations.deleteViaApi(collegeLocation);
        cy.deleteLoanType(collegeLoanTypeId);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C496118 Verify "Suppress from discovery" action for Holdings in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird'] },
        () => {
          // 1
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');

          // 2
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);

          // 3
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane(2);
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          const instances = [folioInstance, marcInstance];

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.INSTANCE,
              instance.title,
            );
          });

          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();

          // 4
          BulkEditActions.downloadMatchedResults();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingUuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.INSTANCE,
              instance.title,
            );
          });

          // 5
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditSearchPane.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditSearchPane.isConfirmButtonDisabled(true);

          // 6
          BulkEditActions.selectOption(suppressFromDiscovery);
          BulkEditSearchPane.verifyInputLabel(suppressFromDiscovery);

          // 7
          BulkEditActions.verifyTheActionOptions(Object.values(actions));

          // 8
          BulkEditActions.selectSecondAction(actions.setTrue);
          BulkEditActions.verifySecondActionSelected(actions.setTrue);
          BulkEditActions.applyToItemsRecordsCheckboxExists(true);
          BulkEditSearchPane.isConfirmButtonDisabled(false);

          // 9
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instance.holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              'true',
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);

          // 10
          BulkEditActions.downloadPreview();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingUuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              'true',
            );
          });

          // 11
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              instance.holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              'true',
            );
          });

          // 12

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingUuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              'true',
            );
          });

          // 13
          ConsortiumManager.switchActiveAffiliation(tenantNames.college);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHrid);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
            HoldingsRecordView.close();
            InventoryInstance.openHoldingsAccordion(collegeLocation.name);
            InventoryInstance.openItemByBarcode(instance.itemBarcode);
            cy.wait(1000);
            ItemRecordView.suppressedAsDiscoveryIsPresent();
          });

          // 14
          ConsortiumManager.switchActiveAffiliation(tenantNames.central);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);

          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');

          // remove earlier downloaded files
          FileManager.deleteFileFromDownloadsByMask(
            matchedRecordsFileName,
            previewFileName,
            changedRecordsFileName,
          );

          // 2
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);

          // 3
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane(2);
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.INSTANCE,
              instance.title,
            );
          });

          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();

          // 4
          BulkEditActions.downloadMatchedResults();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingUuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.INSTANCE,
              instance.title,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingUuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              'true',
            );
          });

          // 5
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditSearchPane.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditSearchPane.isConfirmButtonDisabled(true);

          // 6
          BulkEditActions.selectOption(suppressFromDiscovery);
          BulkEditSearchPane.verifyInputLabel(suppressFromDiscovery);

          // 15
          BulkEditActions.selectSecondAction(actions.setFalse);
          BulkEditActions.verifySecondActionSelected(actions.setFalse);
          BulkEditActions.applyToItemsRecordsCheckboxExists(false);
          BulkEditSearchPane.isConfirmButtonDisabled(false);

          // 16
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instance.holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              'false',
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);

          // 17
          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingUuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              'false',
            );
          });

          // 18
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              instance.holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
              'false',
            );
          });

          // 19
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingUuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              'false',
            );
          });

          // 20
          ConsortiumManager.switchActiveAffiliation(tenantNames.college);
          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHrid);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();
            HoldingsRecordView.close();
            InventoryInstance.openHoldingsAccordion(collegeLocation.name);
            InventoryInstance.openItemByBarcode(instance.itemBarcode);
            cy.wait(1000);
            ItemRecordView.suppressedAsDiscoveryIsPresent();
          });
        },
      );
    });
  });
});
