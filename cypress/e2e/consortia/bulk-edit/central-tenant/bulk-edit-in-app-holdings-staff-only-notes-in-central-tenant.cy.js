import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  getReasonForTenantNotAssociatedError,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import HoldingsNoteTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/holdings/holdingsNoteTypesConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
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
  title: `AT_C494091_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C494091_MarcInstance_${getRandomPostfix()}`,
};
const sharedNoteText = 'Shared note text';
const collegeLocalNoteText = 'College note text';
const centralSharedHoldingNoteType = {
  payload: {
    name: `C494091 shared note type ${randomFourDigitNumber()}`,
  },
};
const collegeHoldingNoteType = {
  name: `C494091 College NoteType ${randomFourDigitNumber()}`,
};
const collegeHoldingNoteTypeNameWithAffiliation = `${collegeHoldingNoteType.name} (${Affiliations.College})`;
const instances = [folioInstance, marcInstance];
const holdingUUIDsFileName = `holdingUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(holdingUUIDsFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(holdingUUIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingUUIDsFileName, true);
const errorsFromCommittingFileName = BulkEditFiles.getErrorsFromCommittingFileName(
  holdingUUIDsFileName,
  true,
);

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditHoldings.gui,
        ]).then((userProperties) => {
          user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.assignAffiliationToUser(affiliation, user.userId);
            cy.setTenant(affiliation);
            cy.assignPermissionsToExistingUser(user.userId, [
              permissions.bulkEditEdit.gui,
              permissions.uiInventoryViewCreateEditHoldings.gui,
            ]);
            cy.resetTenant();
          });

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
          BulkEditSearchPane.verifyPaneRecordsCount('4 holdings');
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          const holdingHrids = [...collegeHoldingHrids, ...universityHoldingHrids];

          holdingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              hrid,
            );
          });

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(4);
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

          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            centralSharedHoldingNoteType.payload.name,
          );
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            collegeHoldingNoteTypeNameWithAffiliation,
          );
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.markAsStaffOnly(centralSharedHoldingNoteType.payload.name);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.removeMarkAsStaffOnly(collegeHoldingNoteTypeNameWithAffiliation, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);
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

          BulkEditSearchPane.verifyErrorLabel(2);

          universityHoldingIds.forEach((id) => {
            BulkEditSearchPane.verifyErrorByIdentifier(
              id,
              getReasonForTenantNotAssociatedError(id, Affiliations.University, 'note type'),
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
              `ERROR,${id},${getReasonForTenantNotAssociatedError(id, Affiliations.University, 'note type')}`,
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
