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
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../../support/fragments/inventory/item/inventoryItems';
import HoldingsNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsNoteTypesConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  HOLDING_NOTE_TYPES,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
} from '../../../../../support/constants';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let loanTypeId;
let materialTypeId;
let centralSharedHoldingNoteTypeData;
const administrativeNoteText = 'Admin note text';
const sharedNoteText = 'Shared note text';
const collegeLocalNoteText = 'College note text';
const folioInstance = {
  title: `AT_C566152_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const centralSharedHoldingNoteType = {
  payload: {
    name: `AT_C566152 shared note type ${randomFourDigitNumber()}`,
  },
};
const collegeHoldingNoteType = {
  name: `AT_C566152 College NoteType ${randomFourDigitNumber()}`,
};
const itemBarcodesFileName = `itemBarcodesFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemBarcodesFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(itemBarcodesFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemBarcodesFileName);

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
            .then((newHoldingNoteType) => {
              centralSharedHoldingNoteTypeData = newHoldingNoteType;
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
              cy.setTenant(Affiliations.College);
              cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
                loanTypeId = res.filter(
                  (loanType) => loanType.name === LOAN_TYPE_NAMES.CAN_CIRCULATE,
                )[0].id;
              });
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });
              // create local holding note type in College tenant
              InventoryInstances.createHoldingsNoteTypeViaApi(collegeHoldingNoteType.name)
                .then((noteId) => {
                  collegeHoldingNoteType.id = noteId;
                })
                .then(() => {
                  // create holdings in College tenant
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: folioInstance.uuid,
                    permanentLocationId: locationId,
                    sourceId,
                    administrativeNotes: [administrativeNoteText],
                    notes: [
                      {
                        holdingsNoteTypeId: centralSharedHoldingNoteTypeData.settingId,
                        note: sharedNoteText,
                        staffOnly: true,
                      },
                      {
                        holdingsNoteTypeId: collegeHoldingNoteType.id,
                        note: collegeLocalNoteText,
                        staffOnly: false,
                      },
                    ],
                  }).then((holding) => {
                    folioInstance.holdingId = holding.id;
                    folioInstance.holdingHrid = holding.hrid;

                    InventoryItems.createItemViaApi({
                      barcode: folioInstance.itemBarcode,
                      holdingsRecordId: folioInstance.holdingId,
                      materialType: { id: materialTypeId },
                      permanentLoanType: { id: loanTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    }).then((item) => {
                      folioInstance.itemId = item.id;
                    });
                  });
                });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${itemBarcodesFileName}`,
                folioInstance.itemBarcode,
              );
            });

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteHoldingsNoteTypeViaApi(collegeHoldingNoteType.id);
        cy.deleteItemViaApi(folioInstance.itemId);
        cy.deleteHoldingRecordViaApi(folioInstance.holdingId);
        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
        HoldingsNoteTypesConsortiumManager.deleteViaApi(centralSharedHoldingNoteTypeData);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C566152 Verify "Remove all" action for Holdings notes in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566152'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Item barcodes');
          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(itemBarcodesFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('1 holdings');
          BulkEditSearchPane.verifyFileNameHeadLine(itemBarcodesFileName);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            folioInstance.holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            folioInstance.holdingHrid,
          );
          BulkEditSearchPane.verifyPaginatorInMatchedRecords(1);
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

          const initialHesderValue = [
            {
              header: centralSharedHoldingNoteType.payload.name,
              value: `${sharedNoteText} (staff only)`,
            },
            { header: collegeHoldingNoteType.name, value: collegeLocalNoteText },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
            folioInstance.holdingHrid,
            initialHesderValue,
          );
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
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            folioInstance.holdingHrid,
            initialHesderValue,
          );
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
          BulkEditActions.noteRemoveAll(HOLDING_NOTE_TYPES.ADMINISTRATIVE_NOTE);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);
          BulkEditActions.noteRemoveAll(centralSharedHoldingNoteType.payload.name, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.noteRemoveAll(collegeHoldingNoteType.name, 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

          const editedHederValue = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              value: '',
            },
            {
              header: collegeHoldingNoteType.name,
              value: '',
            },
            {
              header: centralSharedHoldingNoteType.payload.name,
              value: '',
            },
          ];

          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            folioInstance.holdingHrid,
            editedHederValue,
          );
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            folioInstance.holdingHrid,
            editedHederValue,
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            folioInstance.holdingHrid,
            editedHederValue,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.searchHoldingsByHRID(folioInstance.holdingHrid);
          InventorySearchAndFilter.selectViewHoldings();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkAdministrativeNote('-');
          HoldingsRecordView.checkHoldingNoteTypeAbsent(
            centralSharedHoldingNoteType.payload.name,
            sharedNoteText,
          );
          HoldingsRecordView.checkHoldingNoteTypeAbsent(
            collegeHoldingNoteType.name,
            collegeLocalNoteText,
          );
        },
      );
    });
  });
});
