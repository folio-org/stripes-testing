import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let sourceId;
let locationId;
let sharedFolioInstance;
let sharedMarcInstance;
let allHoldingIds;
let allHoldingHrids;
let collegeHoldingHrids;
let universityHoldingHrids;
const holdingInFolioInstance = {
  collegeHoldingId: null,
  collegeHoldingHrid: null,
  universityHoldingId: null,
  universityHoldingHrid: null,
};
const holdingInMarcInstance = {
  collegeHoldingId: null,
  collegeHoldingHrid: null,
  universityHoldingId: null,
  universityHoldingHrid: null,
};
const holdingUUIDsFileName = `holdingUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);
const newAdministrativeNote = `Administrative note_${getRandomPostfix()}`;
const collegePermissions = [permissions.bulkEditEdit.gui, permissions.uiInventoryViewInstances.gui];
const universityPermissions = [
  permissions.bulkEditView.gui,
  permissions.uiInventoryViewCreateEditHoldings.gui,
];
const centralPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditHoldings.gui,
];

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser(centralPermissions)
          .then((userProperties) => {
            user = userProperties;

            cy.affiliateUserToTenant({
              tenantId: Affiliations.College,
              userId: user.userId,
              permissions: collegePermissions,
            });

            cy.affiliateUserToTenant({
              tenantId: Affiliations.University,
              userId: user.userId,
              permissions: universityPermissions,
            });
          })
          .then(() => {
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              instanceTypeId = instanceTypeData[0].id;
            });
          })
          .then(() => {
            // Create shared FOLIO Instance in Central tenant
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: `AT_C566498_FolioInstance_${getRandomPostfix()}`,
              },
            }).then((createdInstanceData) => {
              sharedFolioInstance = createdInstanceData.instanceId;
            });

            // Create shared MARC Instance in Central tenant
            const marcInstanceTitle = `AT_C566498_MarcInstance_${getRandomPostfix()}`;
            cy.createSimpleMarcBibViaAPI(marcInstanceTitle).then((instanceId) => {
              sharedMarcInstance = instanceId;
            });
          })
          .then(() => {
            // Create Holdings in College tenant
            cy.withinTenant(Affiliations.College, () => {
              cy.getLocations({ limit: 1 }).then((res) => {
                locationId = res.id;
              });
              InventoryHoldings.getHoldingsFolioSource()
                .then((folioSource) => {
                  sourceId = folioSource.id;
                })
                .then(() => {
                  // holding in FOLIO instance
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: sharedFolioInstance,
                    permanentLocationId: locationId,
                    sourceId,
                  }).then((holding) => {
                    holdingInFolioInstance.collegeHoldingId = holding.id;
                    holdingInFolioInstance.collegeHoldingHrid = holding.hrid;
                  });

                  // holding in MARC instance
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: sharedMarcInstance,
                    permanentLocationId: locationId,
                    sourceId,
                  }).then((holding) => {
                    holdingInMarcInstance.collegeHoldingId = holding.id;
                    holdingInMarcInstance.collegeHoldingHrid = holding.hrid;
                  });
                });
            });
          })
          .then(() => {
            // Create Holdings in University tenant
            cy.withinTenant(Affiliations.University, () => {
              cy.getLocations({ limit: 1 }).then((res) => {
                locationId = res.id;
              });
              InventoryHoldings.getHoldingsFolioSource()
                .then((folioSource) => {
                  sourceId = folioSource.id;
                })
                .then(() => {
                  // holding in FOLIO instance
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: sharedFolioInstance,
                    permanentLocationId: locationId,
                    sourceId,
                  }).then((holding) => {
                    holdingInFolioInstance.universityHoldingId = holding.id;
                    holdingInFolioInstance.universityHoldingHrid = holding.hrid;
                  });

                  // holding in MARC instance
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: sharedMarcInstance,
                    permanentLocationId: locationId,
                    sourceId,
                  }).then((holding) => {
                    holdingInMarcInstance.universityHoldingId = holding.id;
                    holdingInMarcInstance.universityHoldingHrid = holding.hrid;
                  });
                });
            });
          })
          .then(() => {
            // Create CSV file with Holdings UUIDs
            allHoldingIds = [
              holdingInFolioInstance.collegeHoldingId,
              holdingInFolioInstance.universityHoldingId,
              holdingInMarcInstance.collegeHoldingId,
              holdingInMarcInstance.universityHoldingId,
            ];
            allHoldingHrids = [
              holdingInFolioInstance.collegeHoldingHrid,
              holdingInFolioInstance.universityHoldingHrid,
              holdingInMarcInstance.collegeHoldingHrid,
              holdingInMarcInstance.universityHoldingHrid,
            ];
            collegeHoldingHrids = [
              holdingInFolioInstance.collegeHoldingHrid,
              holdingInMarcInstance.collegeHoldingHrid,
            ];
            universityHoldingHrids = [
              holdingInFolioInstance.universityHoldingHrid,
              holdingInMarcInstance.universityHoldingHrid,
            ];
            const holdingUUIDs = allHoldingIds.join('\n');
            FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, holdingUUIDs);
          })
          .then(() => {
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
        cy.withinTenant(Affiliations.College, () => {
          InventoryHoldings.deleteHoldingRecordViaApi(holdingInFolioInstance.collegeHoldingId);
          InventoryHoldings.deleteHoldingRecordViaApi(holdingInMarcInstance.collegeHoldingId);
        });
        cy.withinTenant(Affiliations.University, () => {
          InventoryHoldings.deleteHoldingRecordViaApi(holdingInFolioInstance.universityHoldingId);
          InventoryHoldings.deleteHoldingRecordViaApi(holdingInMarcInstance.universityHoldingId);
        });
        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(sharedFolioInstance);
        InventoryInstance.deleteInstanceViaApi(sharedMarcInstance);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C566498 Handling permissions for Holdings edits from the Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566498'] },
        () => {
          // Step 1: Select "Inventory - holdings" radio button, select "Holdings UUIDs" identifier
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');

          // Step 2: Upload .csv file with Holdings UUIDs
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          // Step 3: Check upload result - matched records from both tenants
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('4 holdings');
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaginatorInMatchedRecords(4);

          allHoldingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHrid,
            );
          });

          // Step 4: Download matched records (CSV)
          BulkEditActions.downloadMatchedResults();

          allHoldingHrids.forEach((holdingHrid) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHrid,
            );
          });

          // Step 5: Actions => Start bulk edit
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyRowIcons();

          // Step 6: Select option & action to modify Holdings
          BulkEditActions.selectOption(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          );
          BulkEditActions.selectAction('Add note');
          BulkEditActions.fillInFirstTextArea(newAdministrativeNote);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 7: Click "Confirm changes"
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          allHoldingHrids.forEach((holdingHrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              holdingHrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              newAdministrativeNote,
            );
          });

          // Step 8: Download preview CSV
          BulkEditActions.downloadPreview();

          allHoldingIds.forEach((holdingId) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              newAdministrativeNote,
            );
          });

          // Step 9: Commit changes - verify permission errors
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(0);

          BulkEditSearchPane.verifyErrorLabel(4);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(4);

          // Step 10-12: Check error table with permission errors
          const errorMessageTemplateCollege = (holdingId) => {
            return `User ${user.username} does not have required permission to edit the holdings record - id=${holdingId} on the tenant ${Affiliations.College.toLowerCase()}`;
          };
          const errorMessageTemplateUniversity = (holdingId) => {
            return `User ${user.username} does not have required permission to edit the holdings record - id=${holdingId} on the tenant ${Affiliations.University.toLowerCase()}`;
          };

          BulkEditSearchPane.verifyErrorByIdentifier(
            holdingInFolioInstance.collegeHoldingId,
            errorMessageTemplateCollege(holdingInFolioInstance.collegeHoldingId),
          );
          BulkEditSearchPane.verifyErrorByIdentifier(
            holdingInMarcInstance.collegeHoldingId,
            errorMessageTemplateCollege(holdingInMarcInstance.collegeHoldingId),
          );
          BulkEditSearchPane.verifyErrorByIdentifier(
            holdingInFolioInstance.universityHoldingId,
            errorMessageTemplateUniversity(holdingInFolioInstance.universityHoldingId),
          );
          BulkEditSearchPane.verifyErrorByIdentifier(
            holdingInMarcInstance.universityHoldingId,
            errorMessageTemplateUniversity(holdingInMarcInstance.universityHoldingId),
          );

          // Step 13: Download errors (CSV)
          BulkEditActions.openActions();
          BulkEditActions.downloadErrors();

          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `ERROR,${holdingInFolioInstance.collegeHoldingId},${errorMessageTemplateCollege(holdingInFolioInstance.collegeHoldingId)}`,
            `ERROR,${holdingInMarcInstance.collegeHoldingId},${errorMessageTemplateCollege(holdingInMarcInstance.collegeHoldingId)}`,
            `ERROR,${holdingInFolioInstance.universityHoldingId},${errorMessageTemplateUniversity(holdingInFolioInstance.universityHoldingId)}`,
            `ERROR,${holdingInMarcInstance.universityHoldingId},${errorMessageTemplateUniversity(holdingInMarcInstance.universityHoldingId)}`,
          ]);
          BulkEditFiles.verifyCSVFileRecordsNumber(fileNames.errorsFromCommitting, 4);

          // Step 14: Switch to College tenant and verify changes NOT applied
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

          collegeHoldingHrids.forEach((holdingHrid) => {
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.byKeywords(holdingHrid);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkAdministrativeNote('-');
            HoldingsRecordView.close();
            InventorySearchAndFilter.resetAll();
          });

          // Step 15: Switch to University tenant and verify changes NOT applied
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

          universityHoldingHrids.forEach((holdingHrid) => {
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.byKeywords(holdingHrid);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkAdministrativeNote('-');
            HoldingsRecordView.close();
            InventorySearchAndFilter.resetAll();
          });
        },
      );
    });
  });
});
