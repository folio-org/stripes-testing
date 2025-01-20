import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import SelectLocationsModal from '../../../../support/fragments/bulk-edit/select-locations-modal';
// import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
// import ExportFile from '../../../../support/fragments/data-export/exportFile';
// import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
// import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
// mport QickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DateTools from '../../../../support/utils/dateTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  // APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  // ITEM_STATUS_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
// import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
// let holdingTypeId;
// let locationId;
// let temporaryLocationId;
let sourceId;
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `${today}-Matched-Records-${holdingUUIDsFileName}`;
const previewFileName = `${today}-Updates-Preview-${holdingUUIDsFileName}`;
const changedRecordsFileName = `${today}-Changed-Records-${holdingUUIDsFileName}`;
const folioInstance = {
  title: `C494363 folio instance testBulkEdit_${getRandomPostfix()}`,
  holdingIdsInCollege: null,
  holdingHridsInCollege: null,
  holdingIdsInUniversity: null,
  holdingHridsInUniversity: null,
};
const marcInstance = {
  title: `C494363 marc instance testBulkEdit_${getRandomPostfix()}`,
  holdingIdsInCollege: null,
  holdingHridsInCollege: null,
  holdingIdsInUniversity: null,
  holdingHridsInUniversity: null,
};
const locationsInCollegeData = {};
const locationsInUniversityData = {};
const instances = [folioInstance, marcInstance];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
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
          ]);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditHoldings.gui,
          ]);

          cy.resetTenant();
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          // no main library location on ecs snapshot, return back
          // { query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }
          // cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
          //   locationId = res.id;
          // });
          // cy.getLocations({ query: `name="${LOCATION_NAMES.ONLINE}"` }).then((res) => {
          //   temporaryLocationId = res.id;
          // });

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

              InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
                locationsInCollegeData.permanentLocation = resp[0];
                locationsInCollegeData.temporaryLocation = resp[1];

                instances.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.id,
                    permanentLocationId: locationsInCollegeData.permanentLocation.id,
                    sourceId,
                  }).then((holding) => {
                    instance.holdingIdsInCollege = holding.id;
                    instance.holdingHridsInCollege = holding.hrid;
                  });
                  cy.wait(1000);
                });
              });

              cy.getHoldings({
                limit: 1,
                query: `"instanceId"="${marcInstance.id}"`,
              }).then((holdings) => {
                cy.updateHoldingRecord(marcInstance.holdingIdsInCollege, {
                  ...holdings[0],
                  temporaryLocationId: locationsInCollegeData.temporaryLocation.id,
                });
              });
            })
            .then(() => {
              // create holdings in University tenant
              cy.setTenant(Affiliations.University);

              InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
                locationsInUniversityData.permanentLocation = resp[0];
                locationsInUniversityData.temporaryLocation = resp[1];
                instances.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.id,
                    permanentLocationId: locationsInUniversityData.permanentLocation.id,
                    sourceId,
                  }).then((holding) => {
                    instance.holdingIdsInUniversity = holding.id;
                    instance.holdingHridsInUniversity = holding.hrid;
                    // cy.getHoldings({
                    //   limit: 1,
                    //   query: `"instanceId"="${instance.id}"`,
                    // }).then((holdings) => {
                    //   instance.holdingHridsInUniversity = holdings[0].hrid;
                    // });
                  });
                  cy.wait(1000);
                });
              });

              cy.getHoldings({
                limit: 1,
                query: `"instanceId"="${folioInstance.id}"`,
              }).then((holdings) => {
                cy.updateHoldingRecord(folioInstance.holdingIdsInUniversity, {
                  ...holdings[0],
                  temporaryLocationId: locationsInUniversityData.temporaryLocation.id,
                });
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${holdingUUIDsFileName}`,
                `${folioInstance.holdingIdsInCollege}\r\n${folioInstance.holdingIdsInUniversity}\r\n${marcInstance.holdingIdsInCollege}\r\n${marcInstance.holdingIdsInUniversity}`,
              );
            });

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
          cy.deleteHoldingRecordViaApi(instance.holdingIdsInCollege);
        });

        cy.setTenant(Affiliations.University);

        instances.forEach((instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdingIdsInUniversity);
        });
        cy.resetTenant();
        Users.deleteViaApi(user.userId);

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });

        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C494363 Verify "Replace with" action for Holdings location in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C494363'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('4 holding');
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHridsInCollege,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHridsInCollege,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHridsInUniversity,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHridsInUniversity,
            );
          });

          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();

          // 4
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
          );

          const holdingsWithTempLocationHrids = [
            folioInstance.holdingHridsInUniversity,
            marcInstance.holdingHridsInCollege,
          ];
          const holdingsWithoutTempLocationHrids = [
            folioInstance.holdingHridsInCollege,
            marcInstance.holdingHridsInUniversity,
          ];
          const holdingsWithTempLocationInitialHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              value: LOCATION_NAMES.MAIN_LIBRARY_UI,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
              value: LOCATION_NAMES.ONLINE_UI,
            },
          ];
          const holdingsWithoutTempLocationInitialHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              value: LOCATION_NAMES.MAIN_LIBRARY_UI,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
              value: '',
            },
          ];

          holdingsWithTempLocationHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              holdingHrid,
              holdingsWithTempLocationInitialHeaderValues,
            );
          });
          holdingsWithoutTempLocationHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              holdingHrid,
              holdingsWithoutTempLocationInitialHeaderValues,
            );
          });

          // 5
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          holdingsWithTempLocationHrids.forEach((holdingHrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHrid,
              holdingsWithTempLocationInitialHeaderValues,
            );
          });
          holdingsWithoutTempLocationHrids.forEach((holdingHrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHrid,
              holdingsWithoutTempLocationInitialHeaderValues,
            );
          });

          // 6
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditSearchPane.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditSearchPane.isConfirmButtonDisabled(true);

          // 7
          BulkEditActions.selectOption('Permanent holdings location');
          BulkEditSearchPane.verifyInputLabel('Permanent holdings location');
          BulkEditActions.replaceWithIsDisabled();

          // 8,9,10
          BulkEditActions.locationLookupExists();
          BulkEditActions.clickLocationLookup();
          // the method created but not checked yet
          SelectLocationsModal.verifyLocationLookupModalInCentralTenant();

          /*

          // 11
          SelectLocationsModal.verifyTenantsInAffiliationDropdown(
            tenantNames.college,
            tenantNames.university,
          );

          // 12
          SelectLocationsModal.selectTenantInAffiliationDropdown(tenantNames.college);
          SelectLocationsModal.selectLocation(LOCATION_NAMES.ANNEX_UI);
          SelectLocationsModal.verifySelectLocationModalExists(false);
          SelectLocationsModal.verifyLocationSelected(LOCATION_NAMES.ANNEX_UI);
          BulkEditSearchPane.isConfirmButtonDisabled(false);

          // 13
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);

          // 14
          BulkEditActions.selectOption('Temporary holdings location');
          BulkEditSearchPane.verifyInputLabel('Temporary holdings location');
          BulkEditSearchPane.isConfirmButtonDisabled(true);

          // 15
          BulkEditActions.selectAction('Replace with');
          BulkEditActions.locationLookupExists();

          // 16
          BulkEditActions.clickLocationLookup();
          */
        },
      );
    });
  });
});
