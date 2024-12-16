import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import HoldingsNoteTypes from '../../../../support/fragments/settings/inventory/holdings/holdingsNoteTypes';
import QueryModal, {
  QUERY_OPERATIONS,
  holdingsFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import HoldingsNoteTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/holdings/holdingsNoteTypesConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let centralSharedNoteTypeData;
const callNumberStarts = `${randomFourDigitNumber()}`;
const folioInstance = {
  title: `C477646 folio instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  holdingCallNumberInCollege: `${callNumberStarts}${randomFourDigitNumber()}`,
  holdingCallNumberInUniversity: `${callNumberStarts}${randomFourDigitNumber()}`,
  holdingIds: [],
  holdingHrids: [],
};
const marcInstance = {
  title: `C477646 marc instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  holdingCallNumberInCollege: `${callNumberStarts}${randomFourDigitNumber()}`,
  holdingCallNumberInUniversity: `${callNumberStarts}${randomFourDigitNumber()}`,
  holdingIds: [],
  holdingHrids: [],
};
const administrativeNoteText = "Administrative note ~,!,@,#,$,%,^,&,*,(,),~,', {.[,]<},>,ø, Æ, §,";
const sharedNoteText = 'New shared note';
const localNoteText = 'New local note';
const centralSharedHoldingNoteType = {
  payload: {
    name: `C477646 shared note type ${getRandomPostfix()}`,
  },
};
const localHoldingNoteType = {
  name: `C477646 college NoteType ${getRandomPostfix()}`,
};
const localHoldingNoteTypeNameWithAffiliation = `${localHoldingNoteType.name} (${Affiliations.College})`;
const instances = [folioInstance, marcInstance];
const getReasonForError = (holdingId) => {
  return `${holdingId} cannot be updated because the record is associated with ${Affiliations.University} and note type is not associated with this tenant.`;
};
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewQueryFileName;
let changedRecordsQueryFileName;
let errorsFromCommittingFileName;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditHoldings.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditHoldings.gui,
            permissions.bulkEditQueryView.gui,
          ]);

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditHoldings.gui,
            permissions.bulkEditQueryView.gui,
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
          HoldingsNoteTypesConsortiumManager.createViaApi(centralSharedHoldingNoteType)
            .then((newHoldingNoteType) => {
              centralSharedNoteTypeData = newHoldingNoteType;
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
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.uuid = instanceId;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              // create local item note type in College
              HoldingsNoteTypes.createViaApi({
                name: localHoldingNoteType.name,
                source: 'local',
              }).then((responce) => {
                localHoldingNoteType.id = responce.body.id;
              });
              // create holdings in College tenant
              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.uuid,
                  callNumber: instance.holdingCallNumberInCollege,
                  permanentLocationId: locationId,
                  sourceId,
                }).then((holding) => {
                  instance.holdingIds.push(holding.id);
                  instance.holdingHrids.push(holding.hrid);
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              // create holdings in University tenant
              cy.setTenant(Affiliations.University);

              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.uuid,
                  permanentLocationId: locationId,
                  callNumber: instance.holdingCallNumberInUniversity,
                  sourceId,
                }).then((holding) => {
                  instance.holdingIds.push(holding.id);
                  instance.holdingHrids.push(holding.hrid);
                });
                cy.wait(1000);
              });
            });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(holdingsFieldValues.callNumber);
          QueryModal.verifySelectedField(holdingsFieldValues.callNumber);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInValueTextfield(callNumberStarts);
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        HoldingsNoteTypes.deleteViaApi(localHoldingNoteType.id);

        instances.forEach((instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdingIds[0]);
        });

        cy.setTenant(Affiliations.University);

        instances.forEach((instance) => {
          cy.deleteHoldingRecordViaApi(instance.holdingIds[1]);
        });

        cy.resetTenant();
        cy.getAdminToken();

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        HoldingsNoteTypesConsortiumManager.deleteViaApi(centralSharedNoteTypeData);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsQueryFileName,
          previewQueryFileName,
          changedRecordsQueryFileName,
          errorsFromCommittingFileName,
          identifiersQueryFilename,
        );
      });

      it(
        'C477646 Verify "Add note" action for Holdings in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C477646'] },
        () => {
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            identifiersQueryFilename = `Query-${interceptedUuid}.csv`;
            matchedRecordsQueryFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;
            previewQueryFileName = `*-Updates-Preview-Query-${interceptedUuid}.csv`;
            changedRecordsQueryFileName = `*-Changed-Records-Query-${interceptedUuid}.csv`;
            errorsFromCommittingFileName = `*-Committing-changes-Errors-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane(4);
            BulkEditSearchPane.verifyQueryHeadLine(
              `(holdings.call_number starts with "${callNumberStarts}")`,
            );

            const holdingHrids = [...folioInstance.holdingHrids, ...marcInstance.holdingHrids];

            holdingHrids.forEach((holdingHrid) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                holdingHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                holdingHrid,
              );
            });

            BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
            BulkEditSearchPane.verifyNextPaginationButtonDisabled();
            BulkEditActions.openActions();
            BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
              false,
              centralSharedHoldingNoteType.payload.name,
              localHoldingNoteTypeNameWithAffiliation,
            );
            BulkEditSearchPane.changeShowColumnCheckbox(
              centralSharedHoldingNoteType.payload.name,
              localHoldingNoteTypeNameWithAffiliation,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
            );
            BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
              true,
              centralSharedHoldingNoteType.payload.name,
              localHoldingNoteTypeNameWithAffiliation,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
            );

            const initialHeaderValues = [
              {
                header: centralSharedHoldingNoteType.payload.name,
                value: '',
              },
              { header: localHoldingNoteTypeNameWithAffiliation, value: '' },
            ];

            holdingHrids.forEach((holdingHrid) => {
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
                holdingHrid,
                initialHeaderValues,
              );
            });

            BulkEditSearchPane.changeShowColumnCheckbox(
              centralSharedHoldingNoteType.payload.name,
              localHoldingNoteTypeNameWithAffiliation,
            );
            BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
              false,
              centralSharedHoldingNoteType.payload.name,
              localHoldingNoteTypeNameWithAffiliation,
            );
            BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
              centralSharedHoldingNoteType.payload.name,
              localHoldingNoteTypeNameWithAffiliation,
            );
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();

            holdingHrids.forEach((holdingHrid) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                matchedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                holdingHrid,
                initialHeaderValues,
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
              localHoldingNoteTypeNameWithAffiliation,
            );
            BulkEditActions.clickOptionsSelection();
            BulkEditActions.addItemNoteAndVerify('Administrative note', administrativeNoteText);
            BulkEditSearchPane.isConfirmButtonDisabled(false);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.verifyNewBulkEditRow(1);
            BulkEditActions.addItemNoteAndVerify(
              centralSharedHoldingNoteType.payload.name,
              sharedNoteText,
              1,
            );
            BulkEditActions.verifyStaffOnlyCheckbox(false, 1);
            BulkEditActions.checkStaffOnlyCheckbox(1);
            BulkEditSearchPane.isConfirmButtonDisabled(false);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.verifyNewBulkEditRow(2);
            BulkEditActions.addItemNoteAndVerify(
              localHoldingNoteTypeNameWithAffiliation,
              localNoteText,
              2,
            );
            BulkEditSearchPane.isConfirmButtonDisabled(false);
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

            const headerValuesToEdit = [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
                value: administrativeNoteText,
              },
              {
                header: centralSharedHoldingNoteType.payload.name,
                value: `${sharedNoteText} (staff only)`,
              },
              {
                header: localHoldingNoteTypeNameWithAffiliation,
                value: localNoteText,
              },
            ];

            holdingHrids.forEach((holdingHrid) => {
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
                holdingHrid,
                headerValuesToEdit,
              );
            });

            BulkEditActions.verifyAreYouSureForm(4);

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                instance.holdingHrids[0],
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
                tenantNames.college,
              );
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                instance.holdingHrids[1],
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
                tenantNames.university,
              );
            });

            BulkEditActions.downloadPreview();

            holdingHrids.forEach((holdingHrid) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                previewQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                holdingHrid,
                headerValuesToEdit,
              );
            });
            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                previewQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                instance.holdingHrids[0],
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
                tenantNames.college,
              );
              BulkEditFiles.verifyValueInRowByUUID(
                previewQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                instance.holdingHrids[1],
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
                tenantNames.university,
              );
            });

            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(4);

            const editedHeaderValues = [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
                value: administrativeNoteText,
              },
              {
                header: centralSharedHoldingNoteType.payload.name,
                value: `${sharedNoteText} (staff only)`,
              },
            ];

            holdingHrids.forEach((holdingHrid) => {
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
                holdingHrid,
                editedHeaderValues,
              );
            });
            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
                instance.holdingHrids[0],
                [
                  {
                    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
                    value: tenantNames.college,
                  },
                  {
                    header: localHoldingNoteTypeNameWithAffiliation,
                    value: localNoteText,
                  },
                ],
              );

              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
                instance.holdingHrids[1],
                [
                  {
                    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
                    value: tenantNames.university,
                  },
                  {
                    header: localHoldingNoteTypeNameWithAffiliation,
                    value: '',
                  },
                ],
              );
            });

            BulkEditSearchPane.verifyErrorLabelInErrorAccordion('Bulk edit query', 4, 4, 2);
            BulkEditSearchPane.verifyNonMatchedResults();

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyErrorByIdentifier(
                instance.holdingIds[1],
                getReasonForError(instance.holdingIds[1]),
              );
            });

            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            holdingHrids.forEach((holdingHrid) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                changedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                holdingHrid,
                editedHeaderValues,
              );
            });
            instances.forEach((instance) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                changedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                instance.holdingHrids[0],
                [
                  {
                    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
                    value: tenantNames.college,
                  },
                  {
                    header: localHoldingNoteTypeNameWithAffiliation,
                    value: localNoteText,
                  },
                ],
              );

              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                changedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                instance.holdingHrids[1],
                [
                  {
                    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
                    value: tenantNames.university,
                  },
                  {
                    header: localHoldingNoteTypeNameWithAffiliation,
                    value: '',
                  },
                ],
              );
            });

            BulkEditActions.downloadErrors();

            instances.forEach((instance) => {
              ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
                `${instance.holdingIds[1]},${getReasonForError(instance.holdingIds[1])}`,
              ]);
            });

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

            instances.forEach((instance) => {
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventorySearchAndFilter.switchToHoldings();
              InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHrids[0]);
              InventorySearchAndFilter.selectViewHoldings();
              HoldingsRecordView.waitLoading();
              HoldingsRecordView.checkAdministrativeNote(administrativeNoteText);
              HoldingsRecordView.checkNotesByType(
                1,
                centralSharedHoldingNoteType.payload.name,
                sharedNoteText,
                'Yes',
              );
              HoldingsRecordView.checkNotesByType(
                0,
                localHoldingNoteType.name,
                localNoteText,
                'No',
              );
            });

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);

            instances.forEach((instance) => {
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventorySearchAndFilter.switchToHoldings();
              InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHrids[1]);
              InventorySearchAndFilter.selectViewHoldings();
              HoldingsRecordView.waitLoading();
              HoldingsRecordView.checkAdministrativeNote(administrativeNoteText);
              HoldingsRecordView.checkNotesByType(
                0,
                centralSharedHoldingNoteType.payload.name,
                sharedNoteText,
                'Yes',
              );
              HoldingsRecordView.checkHoldingNoteTypeAbsent(
                localHoldingNoteType.name,
                localNoteText,
              );
            });
          });
        },
      );
    });
  });
});
