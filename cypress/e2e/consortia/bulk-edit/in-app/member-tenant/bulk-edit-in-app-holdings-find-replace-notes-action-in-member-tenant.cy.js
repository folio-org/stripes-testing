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
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import HoldingsNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsNoteTypesConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../../../support/constants';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let centralSharedHoldingNoteTypeData;
const collegeHoldingIds = [];
const collegeHoldingHrids = [];
const folioInstance = {
  title: `AT_C566147_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C566147_MarcInstance_${getRandomPostfix()}`,
};
const centralSharedHoldingNoteType = {
  payload: {
    name: `AT_C566147 shared note type ${randomFourDigitNumber()}`,
  },
};
const collegeHoldingNoteType = {
  name: `AT_C566147 College NoteType ${randomFourDigitNumber()}`,
};
const notes = {
  adminUpperCase: 'Test [administrative] no*te',
  adminLowerCase: 'test [administrative] no*te',
  sharedUpperCase: 'Test holding shared note',
  sharedLowerCase: 'test holding shared note',
  collegeUpperCase: 'Test holding local note',
  collegeLowerCase: 'test holding local note',
};
const notesEdited = {
  adminUpperCase: 'Test [administrative] NOTE',
  adminLowerCase: 'test [administrative] NOTE',
  sharedUpperCase: 'Test holding shared',
  sharedLowerCase: 'test holding shared',
  collegeUpperCase: 'Test holding local',
  collegeLowerCase: 'test holding local',
};
const instances = [folioInstance, marcInstance];
const holdingHRIDsFileName = `holdingHRIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(holdingHRIDsFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(holdingHRIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingHRIDsFileName, true);
const errorsFromCommittingFileName = BulkEditFiles.getErrorsFromCommittingFileName(
  holdingHRIDsFileName,
  true,
);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
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
          ]);
          cy.resetTenant();
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ query: 'name="DCB"' }).then((res) => {
            locationId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });
          // create shared holding note type in Central
          HoldingsNoteTypesConsortiumManager.createViaApi(centralSharedHoldingNoteType)
            .then((newIHoldingNoteType) => {
              centralSharedHoldingNoteTypeData = newIHoldingNoteType;
            })
            .then(() => {
              // create shared folio instance
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              });
            })
            .then((createdInstanceData) => {
              folioInstance.uuid = createdInstanceData.instanceId;
            })
            .then(() => {
              // create shared marc instance
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.uuid = instanceId;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
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
                      administrativeNotes: [notes.adminUpperCase, notes.adminLowerCase],
                      sourceId,
                      notes: [
                        {
                          holdingsNoteTypeId: centralSharedHoldingNoteTypeData.settingId,
                          note: notes.sharedUpperCase,
                          staffOnly: true,
                        },
                        {
                          holdingsNoteTypeId: centralSharedHoldingNoteTypeData.settingId,
                          note: notes.sharedLowerCase,
                          staffOnly: false,
                        },
                        {
                          holdingsNoteTypeId: collegeHoldingNoteType.id,
                          note: notes.collegeUpperCase,
                          staffOnly: true,
                        },
                        {
                          holdingsNoteTypeId: collegeHoldingNoteType.id,
                          note: notes.collegeLowerCase,
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
          cy.login(user.username, user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteHoldingsNoteTypeViaApi(collegeHoldingNoteType.id);

        collegeHoldingIds.forEach((id) => {
          cy.deleteHoldingRecordViaApi(id);
        });

        cy.resetTenant();

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        HoldingsNoteTypesConsortiumManager.deleteViaApi(centralSharedHoldingNoteTypeData);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${holdingHRIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C566147 Verify "Find & replace" action for Holdings notes in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566147'] },
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
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteType.name,
          );

          const initialHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: `${notes.adminUpperCase};${notes.adminLowerCase}`,
            },
            {
              header: centralSharedHoldingNoteType.payload.name,
              value: `${notes.sharedUpperCase} (staff only) | ${notes.sharedLowerCase}`,
            },
            {
              header: collegeHoldingNoteType.name,
              value: `${notes.collegeUpperCase} (staff only) | ${notes.collegeLowerCase}`,
            },
          ];

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              hrid,
              initialHeaderValues,
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
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              initialHeaderValues,
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
          BulkEditActions.noteReplaceWith(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
            'no*te',
            'NOTE',
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.noteReplaceWith(
            centralSharedHoldingNoteType.payload.name,
            'shared note',
            'shared',
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.noteReplaceWith(collegeHoldingNoteType.name, 'local note', 'local', 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              value: `${notesEdited.adminUpperCase};${notesEdited.adminLowerCase}`,
            },
            {
              header: centralSharedHoldingNoteType.payload.name,
              value: `${notesEdited.sharedUpperCase} (staff only) | ${notesEdited.sharedLowerCase}`,
            },
            {
              header: collegeHoldingNoteType.name,
              value: `${notesEdited.collegeUpperCase} (staff only) | ${notesEdited.collegeLowerCase}`,
            },
          ];

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              hrid,
              editedHeaderValues,
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditActions.downloadPreview();

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              editedHeaderValues,
            );
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              hrid,
              editedHeaderValues,
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              editedHeaderValues,
            );
          });

          collegeHoldingHrids.forEach((hrid) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchHoldingsByHRID(hrid);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkExactContentInAdministrativeNote(notesEdited.adminUpperCase);
            HoldingsRecordView.checkExactContentInAdministrativeNote(notesEdited.adminLowerCase, 1);
            HoldingsRecordView.checkNotesByType(
              0,
              collegeHoldingNoteType.name,
              notesEdited.collegeUpperCase,
              'Yes',
            );
            HoldingsRecordView.checkNotesByType(
              0,
              collegeHoldingNoteType.name,
              notesEdited.collegeLowerCase,
              'No',
              1,
            );
            HoldingsRecordView.checkNotesByType(
              1,
              centralSharedHoldingNoteType.payload.name,
              notesEdited.sharedUpperCase,
              'Yes',
            );
            HoldingsRecordView.checkNotesByType(
              1,
              centralSharedHoldingNoteType.payload.name,
              notesEdited.sharedLowerCase,
              'No',
              1,
            );
          });
        },
      );
    });
  });
});
