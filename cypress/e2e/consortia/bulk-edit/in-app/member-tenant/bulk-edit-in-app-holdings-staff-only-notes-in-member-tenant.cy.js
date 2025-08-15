import permissions from '../../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../../../support/fragments/users/users';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../../support/fragments/inventory/holdingsRecordView';
import HoldingsNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsNoteTypesConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../../../support/constants';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import TopMenu from '../../../../../support/fragments/topMenu';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let centralSharedHoldingNoteTypeData;
const folioInstance = {
  title: `AT_C566155_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C566155_MarcInstance_${getRandomPostfix()}`,
};
const collegeHoldingIds = [];
const collegeHoldingHrids = [];
const notes = {
  sharedNoteText: 'test shared note',
  collegeLocalNoteText: 'test local note',
};
const centralSharedHoldingNoteType = {
  payload: {
    name: `AT_C566155 Shared NoteType ${randomFourDigitNumber()}`,
  },
};
const collegeHoldingNoteType = {
  name: `AT_C566155 College NoteType ${randomFourDigitNumber()}`,
};
const instances = [folioInstance, marcInstance];
const holdingUUIDsFileName = `holdingUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // create shared holding note type in Central
        HoldingsNoteTypesConsortiumManager.createViaApi(centralSharedHoldingNoteType)
          .then((newHoldingNoteType) => {
            centralSharedHoldingNoteTypeData = newHoldingNoteType;
          })
          .then(() => {
            cy.withinTenant(Affiliations.College, () => {
              cy.createTempUser([
                permissions.bulkEditEdit.gui,
                permissions.uiInventoryViewCreateEditHoldings.gui,
              ]).then((userProperties) => {
                user = userProperties;

                cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                  instanceTypeId = instanceTypeData[0].id;
                });
                cy.getLocations({ query: 'name="DCB"' }).then((res) => {
                  locationId = res.id;
                });
                InventoryHoldings.getHoldingsFolioSource()
                  .then((folioSource) => {
                    sourceId = folioSource.id;
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
                    // create local holding note type in College tenant
                    InventoryInstances.createHoldingsNoteTypeViaApi(collegeHoldingNoteType.name)
                      .then((noteId) => {
                        collegeHoldingNoteType.id = noteId;
                      })
                      .then(() => {
                        // create holdings in College tenant
                        instances.forEach((instance) => {
                          InventoryHoldings.createHoldingRecordViaApi({
                            instanceId: instance.uuid,
                            permanentLocationId: locationId,
                            sourceId,
                            notes: [
                              {
                                holdingsNoteTypeId: centralSharedHoldingNoteTypeData.settingId,
                                note: notes.sharedNoteText,
                                staffOnly: false,
                              },
                              {
                                holdingsNoteTypeId: collegeHoldingNoteType.id,
                                note: notes.collegeLocalNoteText,
                                staffOnly: true,
                              },
                            ],
                          }).then((holding) => {
                            collegeHoldingIds.push(holding.id);
                            collegeHoldingHrids.push(holding.hrid);
                          });
                          cy.wait(1000);
                        });
                      });
                  })
                  .then(() => {
                    FileManager.createFile(
                      `cypress/fixtures/${holdingUUIDsFileName}`,
                      `${collegeHoldingIds.join('\n')}`,
                    );
                  });

                cy.resetTenant();
                cy.login(user.username, user.password, {
                  path: TopMenu.bulkEditPath,
                  waiter: BulkEditSearchPane.waitLoading,
                });
              });
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        HoldingsNoteTypesConsortiumManager.deleteViaApi(centralSharedHoldingNoteTypeData);
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteHoldingsNoteTypeViaApi(collegeHoldingNoteType.id);

        instances.forEach((instance) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.uuid);
        });

        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C566155 Verify "Staff only" action for Holdings notes in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566155'] },
        () => {
          // Step 1-3: Upload UUIDs and verify preview
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 holdings');
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
            );
          });

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

          // Step 4-6: Show/hide columns for note types
          BulkEditActions.openActions();
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteType.name,
          );
          BulkEditSearchPane.changeShowColumnCheckbox(
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteType.name,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteType.name,
          );

          const initialHeaderValue = [
            {
              header: centralSharedHoldingNoteType.payload.name,
              value: notes.sharedNoteText,
            },
            {
              header: collegeHoldingNoteType.name,
              value: `${notes.collegeLocalNoteText} (staff only)`,
            },
          ];

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              hrid,
              initialHeaderValue,
            );
          });

          BulkEditSearchPane.changeShowColumnCheckbox(
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteType.name,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteType.name,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteType.name,
          );

          // Step 7: Download matched records
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              initialHeaderValue,
            );
          });

          // Step 8-9: Open in-app bulk edit form and verify options
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            centralSharedHoldingNoteType.payload.name,
          );
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(collegeHoldingNoteType.name);
          BulkEditActions.clickOptionsSelection();

          // Step 10-11: Mark shared note as staff only
          BulkEditActions.markAsStaffOnly(centralSharedHoldingNoteType.payload.name);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 12-13: Add row for local note, remove staff only
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.removeMarkAsStaffOnly(collegeHoldingNoteType.name, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 14: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

          const editedHeaderValue = [
            {
              header: centralSharedHoldingNoteType.payload.name,
              value: `${notes.sharedNoteText} (staff only)`,
            },
            {
              header: collegeHoldingNoteType.name,
              value: notes.collegeLocalNoteText,
            },
          ];

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              hrid,
              editedHeaderValue,
            );
          });

          // Step 15: Download preview
          BulkEditActions.downloadPreview();
          collegeHoldingHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              editedHeaderValue,
            );
          });

          // Step 16: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);
          collegeHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              hrid,
              editedHeaderValue,
            );
          });

          // Step 17: Download changed records
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          collegeHoldingHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              editedHeaderValue,
            );
          });

          // Step 18: Inventory app verification
          collegeHoldingHrids.forEach(() => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkNotesByType(
              0,
              collegeHoldingNoteType.name,
              notes.collegeLocalNoteText,
              'No',
            );
            HoldingsRecordView.checkNotesByType(
              1,
              centralSharedHoldingNoteType.payload.name,
              notes.sharedNoteText,
              'Yes',
            );
          });
        },
      );
    });
  });
});
