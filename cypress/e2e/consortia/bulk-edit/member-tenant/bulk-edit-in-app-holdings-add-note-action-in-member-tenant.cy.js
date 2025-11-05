import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
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
  title: `AT_C566143_FolioInstance_${getRandomPostfix()}`,
  holdingCallNumberInCollege: `${callNumberStarts}${randomFourDigitNumber()}`,
};
const marcInstance = {
  title: `AT_C566143_MarcInstance_${getRandomPostfix()}`,
  holdingCallNumberInCollege: `${callNumberStarts}${randomFourDigitNumber()}`,
};
const administrativeNoteText = "Administrative note ~,!,@,#,$,%,^,&,*,(,),~,', {.[,]<},>,ø, Æ, §,";
const sharedNoteText = 'New shared note';
const localNoteText = 'New local note';
const centralSharedHoldingNoteType = {
  payload: {
    name: `AT_C566143 shared note type ${randomFourDigitNumber()}`,
  },
};
const localHoldingNoteType = {
  name: `AT_C566143 college NoteType ${randomFourDigitNumber()}`,
};
const instances = [folioInstance, marcInstance];
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewQueryFileName;
let changedRecordsQueryFileName;
let errorsFromCommittingFileName;

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
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
              // create local holding note type in College
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
                  instance.holdingId = holding.id;
                  instance.holdingHrid = holding.hrid;
                });
                cy.wait(1000);
              });
            });
          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
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
          cy.deleteHoldingRecordViaApi(instance.holdingId);
        });

        cy.resetTenant();

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
        'C566143 Verify "Add note" action for Holdings in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566143'] },
        () => {
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            identifiersQueryFilename = `Query-${interceptedUuid}.csv`;
            matchedRecordsQueryFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;
            previewQueryFileName = `*-Updates-Preview-CSV-Query-${interceptedUuid}.csv`;
            changedRecordsQueryFileName = `*-Changed-Records-CSV-Query-${interceptedUuid}.csv`;
            errorsFromCommittingFileName = `*-Committing-changes-Errors-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 holdings');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(holdings.call_number starts with ${callNumberStarts})`,
            );

            const holdingHrids = [folioInstance.holdingHrid, marcInstance.holdingHrid];

            holdingHrids.forEach((holdingHrid) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                holdingHrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                holdingHrid,
              );
            });

            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);
            BulkEditActions.openActions();
            BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
              false,
              centralSharedHoldingNoteType.payload.name,
              localHoldingNoteType.name,
            );
            BulkEditSearchPane.changeShowColumnCheckbox(
              centralSharedHoldingNoteType.payload.name,
              localHoldingNoteType.name,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
            );
            BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
              true,
              centralSharedHoldingNoteType.payload.name,
              localHoldingNoteType.name,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
            );

            const initialHeaderValues = [
              {
                header: centralSharedHoldingNoteType.payload.name,
                value: '',
              },
              { header: localHoldingNoteType.name, value: '' },
            ];

            holdingHrids.forEach((holdingHrid) => {
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
                holdingHrid,
                initialHeaderValues,
              );
            });

            BulkEditSearchPane.changeShowColumnCheckbox(
              centralSharedHoldingNoteType.payload.name,
              localHoldingNoteType.name,
            );
            BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
              false,
              centralSharedHoldingNoteType.payload.name,
              localHoldingNoteType.name,
            );
            BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
              centralSharedHoldingNoteType.payload.name,
              localHoldingNoteType.name,
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
            BulkEditActions.verifyOptionExistsInSelectOptionDropdown(localHoldingNoteType.name);
            BulkEditActions.clickOptionsSelection();
            BulkEditActions.addItemNoteAndVerify('Administrative note', administrativeNoteText);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.verifyNewBulkEditRow(1);
            BulkEditActions.addItemNoteAndVerify(
              centralSharedHoldingNoteType.payload.name,
              sharedNoteText,
              1,
            );
            BulkEditActions.verifyStaffOnlyCheckbox(false, 1);
            BulkEditActions.checkStaffOnlyCheckbox(1);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.verifyNewBulkEditRow(2);
            BulkEditActions.addItemNoteAndVerify(localHoldingNoteType.name, localNoteText, 2);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

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
                header: localHoldingNoteType.name,
                value: localNoteText,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
                value: tenantNames.college,
              },
            ];

            holdingHrids.forEach((holdingHrid) => {
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
                holdingHrid,
                headerValuesToEdit,
              );
            });

            BulkEditActions.verifyAreYouSureForm(2);
            BulkEditActions.downloadPreview();

            holdingHrids.forEach((holdingHrid) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                previewQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                holdingHrid,
                headerValuesToEdit,
              );
            });

            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(2);

            holdingHrids.forEach((holdingHrid) => {
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
                holdingHrid,
                headerValuesToEdit,
              );
            });

            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            holdingHrids.forEach((holdingHrid) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                changedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                holdingHrid,
                headerValuesToEdit,
              );
            });

            instances.forEach((instance) => {
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventorySearchAndFilter.switchToHoldings();
              InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHrid);
              InventorySearchAndFilter.selectViewHoldings();
              HoldingsRecordView.waitLoading();
              HoldingsRecordView.checkAdministrativeNote(administrativeNoteText);
              HoldingsRecordView.checkNotesByType(
                0,
                localHoldingNoteType.name,
                localNoteText,
                'No',
              );
              HoldingsRecordView.checkNotesByType(
                1,
                centralSharedHoldingNoteType.payload.name,
                sharedNoteText,
                'Yes',
              );
            });
          });
        },
      );
    });
  });
});
