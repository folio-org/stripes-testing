import permissions from '../../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../../support/fragments/topMenu';
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
  HOLDING_NOTE_TYPES,
} from '../../../../../support/constants';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let centralSharedHoldingNoteTypeData;
const folioInstance = {
  title: `AT_C566149_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C566149_MarcInstance_${getRandomPostfix()}`,
};
const collegeHoldingIds = [];
const collegeHoldingHrids = [];
const notes = {
  administrativeNoteText: 'te;st: [administrative] no*te',
  sharedNoteText: 'test holdings shared note',
  collegeLocalNoteText: 'test holdings local note',
};
const editedNotes = {
  administrativeNoteText: '',
  sharedNoteText: 'null',
  collegeLocalNoteText: 'null',
};
const centralSharedHoldingNoteType = {
  payload: {
    name: `AT_C566149 Shared NoteType ${randomFourDigitNumber()}`,
  },
};
const collegeHoldingNoteType = {
  name: `AT_C566149 College NoteType ${randomFourDigitNumber()}`,
};
const instances = [folioInstance, marcInstance];
const holdingHRIDsFileName = `holdingHRIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingHRIDsFileName, true);
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditHoldings.gui,
];

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
            cy.createTempUser(userPermissions).then((userProperties) => {
              user = userProperties;

              cy.assignAffiliationToUser(Affiliations.College, user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, userPermissions);

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
                          administrativeNotes: [notes.administrativeNoteText],
                          notes: [
                            {
                              holdingsNoteTypeId: centralSharedHoldingNoteTypeData.settingId,
                              note: notes.sharedNoteText,
                              staffOnly: false,
                            },
                            {
                              holdingsNoteTypeId: collegeHoldingNoteType.id,
                              note: notes.collegeLocalNoteText,
                              staffOnly: false,
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
                    `cypress/fixtures/${holdingHRIDsFileName}`,
                    `${collegeHoldingHrids.join('\n')}`,
                  );
                });

              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
            });

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
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
        FileManager.deleteFile(`cypress/fixtures/${holdingHRIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C566149 Verify "Find & remove" action for Holdings notes in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566149'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings HRIDs');
          BulkEditSearchPane.uploadFile(holdingHRIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(holdingHRIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 holdings');
          BulkEditSearchPane.verifyFileNameHeadLine(holdingHRIDsFileName);

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
            );
          });

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
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

          const initialHeaderValueInCollege = [
            {
              header: centralSharedHoldingNoteType.payload.name,
              value: notes.sharedNoteText,
            },
            {
              header: collegeHoldingNoteType.name,
              value: notes.collegeLocalNoteText,
            },
          ];

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              hrid,
              initialHeaderValueInCollege,
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
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              initialHeaderValueInCollege,
            );
          });

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
          BulkEditActions.noteRemove(
            HOLDING_NOTE_TYPES.ADMINISTRATIVE_NOTE,
            notes.administrativeNoteText,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.noteRemove(
            centralSharedHoldingNoteType.payload.name,
            notes.sharedNoteText,
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.noteRemove(collegeHoldingNoteType.name, notes.collegeLocalNoteText, 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          const editedHeaderValuesInCollege = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              value: editedNotes.administrativeNoteText,
            },
            {
              header: collegeHoldingNoteType.name,
              value: editedNotes.collegeLocalNoteText,
            },
            {
              header: centralSharedHoldingNoteType.payload.name,
              value: editedNotes.sharedNoteText,
            },
          ];
          const editedHeaderValuesInCollegeInFile = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              value: editedNotes.administrativeNoteText,
            },
            {
              header: collegeHoldingNoteType.name,
              value: null,
            },
            {
              header: centralSharedHoldingNoteType.payload.name,
              value: null,
            },
          ];

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              hrid,
              editedHeaderValuesInCollege,
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditActions.downloadPreview();

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.previewRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              editedHeaderValuesInCollegeInFile,
            );
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              hrid,
              editedHeaderValuesInCollege,
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              editedHeaderValuesInCollegeInFile,
            );
          });

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.searchInstanceByTitle(instance.title);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkAdministrativeNote('No value set\n-');
            HoldingsRecordView.checkNotesByType(
              1,
              centralSharedHoldingNoteType.payload.name,
              '-',
              'No',
            );
            HoldingsRecordView.checkNotesByType(0, collegeHoldingNoteType.name, '-', 'No');
          });
        },
      );
    });
  });
});
