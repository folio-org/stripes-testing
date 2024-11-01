import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
// import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
// import ExportFile from '../../../../support/fragments/data-export/exportFile';
// import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
// import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
// import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
// import HoldingsNoteTypes from '../../../../support/fragments/settings/inventory/holdings/holdingsNoteTypes';
import HoldingsNoteTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/holdings/holdingsNoteTypesConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DateTools from '../../../../support/utils/dateTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  // APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  // ITEM_STATUS_NAMES,
  // HOLDING_NOTE_TYPES,
} from '../../../../support/constants';
// import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
// let loanTypeId;
// let materialTypeId;
let sourceId;
let centralSharedHoldingNoteTypeData;
const folioInstance = {
  title: `C478252 folio instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  holdingIds: [],
  holdingHrids: [],
};
const marcInstance = {
  title: `C478252 marc instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  holdingIds: [],
  holdingHrids: [],
};
// const administrativeNoteText = "Administrative note ~,!,@,#,$,%,^,&,*,(,),~,', {.[,]<},>,ø, Æ, §,";
// const sharedNoteText = 'New shared note';
// const localNoteText = 'New local note';
// const checkInNoteText = "Check in note ~,!,@,#,$,%,^,&,*,(,),~,', {.[,]<},>,ø, Æ, §,";
// const checkOutNoteText = 'Check out note staff only';
const centralSharedHoldingNoteType = {
  payload: {
    name: `C478252 shared note type ${getRandomPostfix()}`,
  },
};
const collegeHoldingNoteType = {
  name: `College NoteType ${getRandomPostfix()}`,
};
const universityHoldingNoteType = {
  name: `University NoteType ${getRandomPostfix()}`,
};
const collegeHoldingNoteTypeNameWithAffiliation = `${collegeHoldingNoteType.name} (${Affiliations.College})`;
const universityHoldingNoteTypeNameWithAffiliation = `${universityHoldingNoteType.name} (${Affiliations.University})`;
const instances = [folioInstance, marcInstance];
// const getReasonForError = (itemId) => {
// return `${itemId} cannot be updated because the record is associated with ${Affiliations.University} and note type is not associated with this tenant.`;
// };
const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const holdingUUIDsFileName = `holdingUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `${todayDate}-Matched-Records-${holdingUUIDsFileName}`;
const previewFileName = `${todayDate}-Updates-Preview-${holdingUUIDsFileName}`;
const changedRecordsFileName = `${todayDate}-Changed-Records-${holdingUUIDsFileName}`;
const errorsFromCommittingFileName = `${todayDate}-Committing-changes-Errors-${holdingUUIDsFileName}`;

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
          cy.getLocations({ limit: 1 }).then((res) => {
            locationId = res.id;
          });
          // cy.getLoanTypes({ limit: 1 }).then((res) => {
          //   loanTypeId = res[0].id;
          // });
          // cy.getMaterialTypes({ limit: 1 }).then((res) => {
          //   materialTypeId = res.id;
          // });
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
              // create local item note type in College tenant
              InventoryInstances.createHoldingsNoteTypeViaApi(collegeHoldingNoteType.name).then(
                (noteId) => {
                  collegeHoldingNoteType.id = noteId;
                },
              );
              // create holdings in College tenant
              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.uuid,
                  permanentLocationId: locationId,
                  sourceId,
                  administrativeNotes: ['Admin note text'],
                  notes: [
                    {
                      holdingsNoteTypeId: centralSharedHoldingNoteTypeData.id,
                      note: 'Shared note',
                      staffOnly: true,
                    },
                    {
                      holdingsNoteTypeId: collegeHoldingNoteType.id,
                      note: 'College note',
                      staffOnly: false,
                    },
                  ],
                }).then((holding) => {
                  instance.holdingIds.push(holding.id);
                  instance.holdingHrids.push(holding.hrid);
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
              // create local item note type in University tenant
              InventoryInstances.createHoldingsNoteTypeViaApi(universityHoldingNoteType.name).then(
                (noteId) => {
                  universityHoldingNoteType.id = noteId;
                },
              );
              // create holdings in University tenant
              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.uuid,
                  permanentLocationId: locationId,
                  sourceId,
                  administrativeNotes: ['Admin note text'],
                  notes: [
                    {
                      holdingsNoteTypeId: centralSharedHoldingNoteTypeData.id,
                      note: 'Shared note',
                      staffOnly: true,
                    },
                    {
                      holdingsNoteTypeId: universityHoldingNoteType.id,
                      note: 'University note',
                      staffOnly: false,
                    },
                  ],
                }).then((holding) => {
                  instance.holdingIds.push(holding.id);
                  instance.holdingHrids.push(holding.hrid);
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${holdingUUIDsFileName}`,
                `${folioInstance.holdingIds.join('\n')}\n${marcInstance.holdingIds.join('\n')}`,
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

        instances.forEach((instance) => {
          cy.deleteItemViaApi(instance.itemIds[0]);
          cy.deleteHoldingRecordViaApi(instance.holdingIds[0]);
        });

        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteHoldingsNoteTypeViaApi(universityHoldingNoteType.id);

        instances.forEach((instance) => {
          cy.deleteItemViaApi(instance.itemIds[1]);
          cy.deleteHoldingRecordViaApi(instance.holdingIds[1]);
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
        'C478252 Verify "Change note type" action for Holdings in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C478252'] },
        () => {
          // 1
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount(4);
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          const holdingHrids = [...folioInstance.holdingHrids, ...marcInstance.holdingHrids];

          holdingHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              'Admin note text',
            );
          });
          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();

          // 4
          BulkEditActions.openActions();
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteTypeNameWithAffiliation,
            universityHoldingNoteTypeNameWithAffiliation,
          );

          // 5
          BulkEditSearchPane.changeShowColumnCheckbox(
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteTypeNameWithAffiliation,
            universityHoldingNoteTypeNameWithAffiliation,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteTypeNameWithAffiliation,
            universityHoldingNoteTypeNameWithAffiliation,
          );

          const collegeHoldingsHrids = [
            folioInstance.holdingHrids[0],
            marcInstance.holdingHrids[0],
          ];
          const universityHoldingsHrids = [
            folioInstance.holdingHrids[1],
            marcInstance.holdingHrids[1],
          ];

          collegeHoldingsHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              hrid,
              [
                {
                  header: centralSharedHoldingNoteType.payload.name,
                  value: 'Shared note',
                },
                { header: collegeHoldingNoteTypeNameWithAffiliation, value: 'College note' },
              ],
            );
          });
          universityHoldingsHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
              hrid,
              [
                {
                  header: centralSharedHoldingNoteType.payload.name,
                  value: 'Shared note',
                },
                { header: universityHoldingNoteTypeNameWithAffiliation, value: 'University note' },
              ],
            );
          });

          //     const initialHeaderValues = [
          //       {
          //         header: centralSharedItemNoteType.payload.name,
          //         value: '',
          //       },
          //       { header: localItemNoteTypeNameWithAffiliation, value: '' },
          //     ];

          //     itemBarcodes.forEach((barcode) => {
          //       BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
          //         barcode,
          //         initialHeaderValues,
          //       );
          //     });
          //     instances.forEach((instance) => {
          //       BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          //         instance.barcodeInCollege,
          //         BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
          //         tenantNames.college,
          //       );
          //       BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          //         instance.barcodeInUniversity,
          //         BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
          //         tenantNames.university,
          //       );
          //     });

          // 6
          BulkEditSearchPane.changeShowColumnCheckbox(
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteTypeNameWithAffiliation,
            universityHoldingNoteTypeNameWithAffiliation,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteTypeNameWithAffiliation,
            universityHoldingNoteTypeNameWithAffiliation,
          );

          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            centralSharedHoldingNoteType.payload.name,
            collegeHoldingNoteTypeNameWithAffiliation,
            universityHoldingNoteTypeNameWithAffiliation,
          );

          // 7
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          //     itemBarcodes.forEach((barcode) => {
          //       BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          //         matchedRecordsFileName,
          //         BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          //         barcode,
          //         initialHeaderValues,
          //       );
          //     });

          //     BulkEditActions.openInAppStartBulkEditFrom();
          //     BulkEditSearchPane.verifyBulkEditsAccordionExists();
          //     BulkEditActions.verifyOptionsDropdown();
          //     BulkEditActions.verifyRowIcons();
          //     BulkEditActions.verifyCancelButtonDisabled(false);
          //     BulkEditSearchPane.isConfirmButtonDisabled(true);
          //     BulkEditActions.clickOptionsSelection();
          //     BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
          //       centralSharedItemNoteType.payload.name,
          //     );
          //     BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
          //       localItemNoteTypeNameWithAffiliation,
          //     );
          //     BulkEditActions.clickOptionsSelection();
          //     BulkEditActions.addItemNoteAndVerify('Administrative note', administrativeNoteText);
          //     BulkEditSearchPane.isConfirmButtonDisabled(false);
          //     BulkEditActions.addNewBulkEditFilterString();
          //     BulkEditActions.verifyNewBulkEditRow(1);
          //     BulkEditActions.addItemNoteAndVerify(
          //       centralSharedItemNoteType.payload.name,
          //       sharedNoteText,
          //       1,
          //     );
          //     BulkEditActions.verifyStaffOnlyCheckbox(false, 1);
          //     BulkEditActions.checkStaffOnlyCheckbox(1);
          //     BulkEditSearchPane.isConfirmButtonDisabled(false);
          //     BulkEditActions.addNewBulkEditFilterString();
          //     BulkEditActions.verifyNewBulkEditRow(2);
          //     BulkEditActions.addItemNoteAndVerify(
          //       localItemNoteTypeNameWithAffiliation,
          //       localNoteText,
          //       2,
          //     );
          //     BulkEditSearchPane.isConfirmButtonDisabled(false);
          //     BulkEditActions.addNewBulkEditFilterString();
          //     BulkEditActions.verifyNewBulkEditRow(3);
          //     BulkEditActions.addItemNoteAndVerify('Check in note', checkInNoteText, 3);
          //     BulkEditActions.verifyStaffOnlyCheckbox(false, 3);
          //     BulkEditSearchPane.isConfirmButtonDisabled(false);
          //     BulkEditActions.addNewBulkEditFilterString();
          //     BulkEditActions.verifyNewBulkEditRow(4);
          //     BulkEditActions.addItemNoteAndVerify('Check out note', checkOutNoteText, 4);
          //     BulkEditActions.verifyStaffOnlyCheckbox(false, 4);
          //     BulkEditActions.checkStaffOnlyCheckbox(4);
          //     BulkEditSearchPane.isConfirmButtonDisabled(false);
          //     BulkEditActions.confirmChanges();
          //     BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          //     const headerValuesToEdit = [
          //       {
          //         header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          //         value: administrativeNoteText,
          //       },
          //       {
          //         header: centralSharedItemNoteType.payload.name,
          //         value: `${sharedNoteText} (staff only)`,
          //       },
          //       {
          //         header: localItemNoteTypeNameWithAffiliation,
          //         value: localNoteText,
          //       },
          //       {
          //         header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
          //         value: checkInNoteText,
          //       },
          //       {
          //         header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
          //         value: `${checkOutNoteText} (staff only)`,
          //       },
          //     ];

          //     itemBarcodes.forEach((barcode) => {
          //       BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          //         barcode,
          //         headerValuesToEdit,
          //       );
          //     });

          //     BulkEditActions.verifyAreYouSureForm(4);

          //     instances.forEach((instance) => {
          //       BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          //         instance.barcodeInCollege,
          //         BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
          //         tenantNames.college,
          //       );
          //       BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          //         instance.barcodeInUniversity,
          //         BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
          //         tenantNames.university,
          //       );
          //     });

          //     BulkEditActions.downloadPreview();

          //     itemBarcodes.forEach((barcode) => {
          //       BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          //         previewFileName,
          //         BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          //         barcode,
          //         headerValuesToEdit,
          //       );
          //     });
          //     instances.forEach((instance) => {
          //       BulkEditFiles.verifyValueInRowByUUID(
          //         previewFileName,
          //         BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          //         instance.barcodeInCollege,
          //         BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
          //         tenantNames.college,
          //       );
          //       BulkEditFiles.verifyValueInRowByUUID(
          //         previewFileName,
          //         BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          //         instance.barcodeInUniversity,
          //         BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
          //         tenantNames.university,
          //       );
          //     });

          //     BulkEditActions.commitChanges();
          //     BulkEditActions.verifySuccessBanner(4);

          //     const editedHeaderValues = [
          //       {
          //         header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          //         value: administrativeNoteText,
          //       },
          //       {
          //         header: centralSharedItemNoteType.payload.name,
          //         value: `${sharedNoteText} (staff only)`,
          //       },

          //       {
          //         header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
          //         value: checkInNoteText,
          //       },
          //       {
          //         header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
          //         value: `${checkOutNoteText} (staff only)`,
          //       },
          //     ];

          //     itemBarcodes.forEach((barcode) => {
          //       BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          //         barcode,
          //         editedHeaderValues,
          //       );
          //     });
          //     instances.forEach((instance) => {
          //       BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          //         instance.barcodeInCollege,
          //         [
          //           {
          //             header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
          //             value: tenantNames.college,
          //           },
          //           {
          //             header: localItemNoteTypeNameWithAffiliation,
          //             value: localNoteText,
          //           },
          //         ],
          //       );
          //       BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          //         instance.barcodeInUniversity,
          //         [
          //           {
          //             header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
          //             value: tenantNames.university,
          //           },
          //           {
          //             header: localItemNoteTypeNameWithAffiliation,
          //             value: '',
          //           },
          //         ],
          //       );
          //     });

          //     BulkEditSearchPane.verifyErrorLabelInErrorAccordion(itemUUIDsFileName, 4, 4, 2);
          //     BulkEditSearchPane.verifyNonMatchedResults();

          //     instances.forEach((instance) => {
          //       BulkEditSearchPane.verifyErrorByIdentifier(
          //         instance.itemIds[1],
          //         getReasonForError(instance.itemIds[1]),
          //       );
          //     });

          //     BulkEditActions.openActions();
          //     BulkEditActions.downloadChangedCSV();

          //     itemBarcodes.forEach((barcode) => {
          //       BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          //         changedRecordsFileName,
          //         BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          //         barcode,
          //         editedHeaderValues,
          //       );
          //     });
          //     instances.forEach((instance) => {
          //       BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          //         changedRecordsFileName,
          //         BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          //         instance.barcodeInCollege,
          //         [
          //           {
          //             header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
          //             value: tenantNames.college,
          //           },
          //           {
          //             header: localItemNoteTypeNameWithAffiliation,
          //             value: localNoteText,
          //           },
          //         ],
          //       );
          //       BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          //         changedRecordsFileName,
          //         BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          //         instance.barcodeInUniversity,
          //         [
          //           {
          //             header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
          //             value: tenantNames.university,
          //           },
          //           {
          //             header: localItemNoteTypeNameWithAffiliation,
          //             value: '',
          //           },
          //         ],
          //       );
          //     });

          //     BulkEditActions.downloadErrors();

          //     instances.forEach((instance) => {
          //       ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
          //         `${instance.itemIds[1]},${getReasonForError(instance.itemIds[1])}`,
          //       ]);
          //     });

          //     ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          //     instances.forEach((instance) => {
          //       TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          //       InventorySearchAndFilter.switchToItem();
          //       InventorySearchAndFilter.searchByParameter('Barcode', instance.barcodeInCollege);
          //       ItemRecordView.waitLoading();
          //       ItemRecordView.checkItemAdministrativeNote(administrativeNoteText);
          //       ItemRecordView.checkMultipleItemNotesWithStaffOnly(
          //         0,
          //         'Yes',
          //         centralSharedItemNoteType.payload.name,
          //         sharedNoteText,
          //       );
          //       ItemRecordView.checkMultipleItemNotesWithStaffOnly(
          //         1,
          //         'No',
          //         localItemNoteType.name,
          //         localNoteText,
          //       );
          //       ItemRecordView.checkCheckInNote(checkInNoteText, 'No');
          //       ItemRecordView.checkCheckOutNote(checkOutNoteText);
          //     });

          //     ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);

          //     instances.forEach((instance) => {
          //       TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          //       InventorySearchAndFilter.switchToItem();
          //       InventorySearchAndFilter.searchByParameter('Barcode', instance.barcodeInUniversity);
          //       ItemRecordView.waitLoading();
          //       ItemRecordView.checkItemAdministrativeNote(administrativeNoteText);
          //       ItemRecordView.checkMultipleItemNotesWithStaffOnly(
          //         0,
          //         'Yes',
          //         centralSharedItemNoteType.payload.name,
          //         sharedNoteText,
          //       );
          //       ItemRecordView.checkCheckInNote(checkInNoteText, 'No');
          //       ItemRecordView.checkCheckOutNote(checkOutNoteText);
          //       ItemRecordView.checkItemNoteAbsent(localItemNoteType.name);
          //     });
        },
      );
    });
  });
});
