import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import HoldingsNoteTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/holdings/holdingsNoteTypesConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DateTools from '../../../../support/utils/dateTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let centralSharedHoldingNoteTypeData;
const collegeHoldingIds = [];
const collegeHoldingHrids = [];
const universityHoldingIds = [];
const universityHoldingHrids = [];
const folioInstance = {
  title: `C494091 folio instance testBulkEdit_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `C494091 marc instance testBulkEdit_${getRandomPostfix()}`,
};
const sharedNoteText = 'Shared note text';
const collegeLocalNoteText = 'College note text';
const centralSharedHoldingNoteType = {
  payload: {
    name: `C494091 shared note type ${getRandomPostfix()}`,
  },
};
const collegeHoldingNoteType = {
  name: `C494091 College NoteType ${getRandomPostfix()}`,
};
const collegeHoldingNoteTypeNameWithAffiliation = `${collegeHoldingNoteType.name} (${Affiliations.College})`;
const instances = [folioInstance, marcInstance];
const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const holdingUUIDsFileName = `holdingUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `${todayDate}-Matched-Records-${holdingUUIDsFileName}`;
const previewFileName = `${todayDate}-Updates-Preview-${holdingUUIDsFileName}`;
const changedRecordsFileName = `${todayDate}-Changed-Records-${holdingUUIDsFileName}`;
const errorsFromCommittingFileName = `${todayDate}-Committing-changes-Errors-${holdingUUIDsFileName}`;
const getReasonForError = (itemId, tenantName) => {
  return `${itemId} cannot be updated because the record is associated with ${tenantName} and note type is not associated with this tenant.`;
};

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
                      sourceId,
                      notes: [
                        {
                          holdingsNoteTypeId: centralSharedHoldingNoteTypeData.settingId,
                          note: sharedNoteText,
                          staffOnly: false,
                        },
                        {
                          holdingsNoteTypeId: collegeHoldingNoteType.id,
                          note: collegeLocalNoteText,
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
              cy.setTenant(Affiliations.University);
              // create holdings in University tenant
              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.uuid,
                  permanentLocationId: locationId,
                  sourceId,
                  notes: [
                    {
                      holdingsNoteTypeId: centralSharedHoldingNoteTypeData.settingId,
                      note: sharedNoteText,
                      staffOnly: false,
                    },
                  ],
                }).then((holding) => {
                  universityHoldingIds.push(holding.id);
                  universityHoldingHrids.push(holding.hrid);
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${holdingUUIDsFileName}`,
                `${collegeHoldingIds.join('\n')}\n${universityHoldingIds.join('\n')}`,
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
        InventoryInstances.deleteHoldingsNoteTypeViaApi(collegeHoldingNoteType.id);

        collegeHoldingIds.forEach((id) => {
          cy.deleteHoldingRecordViaApi(id);
        });

        cy.setTenant(Affiliations.University);

        universityHoldingIds.forEach((id) => {
          cy.deleteHoldingRecordViaApi(id);
        });

        cy.resetTenant();
        cy.getAdminToken();

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        HoldingsNoteTypesConsortiumManager.deleteViaApi(centralSharedHoldingNoteTypeData);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C494091 Verify "Staff only" action for Holdings notes in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C494091'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount(4);
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          const holdingHrids = [...collegeHoldingHrids, ...universityHoldingHrids];

          holdingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
            );
          });

          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();
          BulkEditActions.openActions();
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteTypeNameWithAffiliation,
          );
          BulkEditSearchPane.changeShowColumnCheckbox(
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteTypeNameWithAffiliation,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteTypeNameWithAffiliation,
          );

          const initialHeaderValueInCollege = [
            {
              header: centralSharedHoldingNoteType.payload.name,
              value: sharedNoteText,
            },
            { header: collegeHoldingNoteTypeNameWithAffiliation, value: collegeLocalNoteText },
          ];
          const initialHeaderValueInUniversity = [
            {
              header: centralSharedHoldingNoteType.payload.name,
              value: sharedNoteText,
            },
            { header: collegeHoldingNoteTypeNameWithAffiliation, value: '' },
          ];

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              hrid,
              initialHeaderValueInCollege,
            );
          });
          universityHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              hrid,
              initialHeaderValueInUniversity,
            );
          });

          BulkEditSearchPane.changeShowColumnCheckbox(
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteTypeNameWithAffiliation,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteTypeNameWithAffiliation,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteTypeNameWithAffiliation,
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              initialHeaderValueInCollege,
            );
          });
          universityHoldingHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              initialHeaderValueInUniversity,
            );
          });

          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditSearchPane.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditSearchPane.isConfirmButtonDisabled(true);
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            centralSharedHoldingNoteType.payload.name,
          );
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            collegeHoldingNoteTypeNameWithAffiliation,
          );
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.markAsStaffOnly(centralSharedHoldingNoteType.payload.name);
          BulkEditSearchPane.isConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.removeMarkAsStaffOnly(collegeHoldingNoteTypeNameWithAffiliation, 1);
          BulkEditSearchPane.isConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          const editedHeaderValueInCollege = [
            {
              header: collegeHoldingNoteTypeNameWithAffiliation,
              value: collegeLocalNoteText,
            },
            {
              header: centralSharedHoldingNoteType.payload.name,
              value: `${sharedNoteText} (staff only)`,
            },
          ];
          const editedHeaderValueInUniversity = [
            {
              header: centralSharedHoldingNoteType.payload.name,
              value: `${sharedNoteText} (staff only)`,
            },
            {
              header: collegeHoldingNoteTypeNameWithAffiliation,
              value: '',
            },
          ];

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              hrid,
              editedHeaderValueInCollege,
            );
          });
          universityHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
              hrid,
              editedHeaderValueInUniversity,
            );
          });

          BulkEditActions.verifyAreYouSureForm(4);
          BulkEditActions.downloadPreview();

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              editedHeaderValueInCollege,
            );
          });
          universityHoldingHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              editedHeaderValueInUniversity,
            );
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(4);

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              hrid,
              editedHeaderValueInCollege,
            );
          });
          universityHoldingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
              hrid,
              editedHeaderValueInUniversity,
            );
          });

          BulkEditSearchPane.verifyErrorLabelInErrorAccordion(holdingUUIDsFileName, 4, 4, 2);
          BulkEditSearchPane.verifyNonMatchedResults();

          universityHoldingIds.forEach((id) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              id,
              getReasonForError(id, Affiliations.University),
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          collegeHoldingHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              editedHeaderValueInCollege,
            );
          });
          universityHoldingHrids.forEach((hrid) => {
            BulkEditFiles.verifyHeaderValueInRowByIdentifier(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
              editedHeaderValueInUniversity,
            );
          });

          BulkEditActions.downloadErrors();

          universityHoldingIds.forEach((id) => {
            ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
              `${id},${getReasonForError(id, Affiliations.University)}`,
            ]);
          });

          BulkEditFiles.verifyCSVFileRecordsNumber(errorsFromCommittingFileName, 2);

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          collegeHoldingHrids.forEach((hrid) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchHoldingsByHRID(hrid);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkNotesByType(
              0,
              collegeHoldingNoteType.name,
              collegeLocalNoteText,
              'No',
            );
            HoldingsRecordView.checkNotesByType(
              1,
              centralSharedHoldingNoteType.payload.name,
              sharedNoteText,
              'Yes',
            );
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);

          universityHoldingHrids.forEach((hrid) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.searchHoldingsByHRID(hrid);
            InventorySearchAndFilter.selectViewHoldings();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkNotesByType(
              0,
              centralSharedHoldingNoteType.payload.name,
              sharedNoteText,
              'Yes',
            );
            HoldingsRecordView.checkHoldingNoteTypeAbsent(
              collegeHoldingNoteType.name,
              collegeLocalNoteText,
            );
          });
        },
      );
    });
  });
});