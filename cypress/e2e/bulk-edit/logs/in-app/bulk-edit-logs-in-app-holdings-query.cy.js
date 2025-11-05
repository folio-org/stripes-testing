import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  QUERY_OPERATIONS,
  holdingsFieldValues,
  enumOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import FileManager from '../../../../support/utils/fileManager';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { BULK_EDIT_TABLE_COLUMN_HEADERS, LOCATION_NAMES } from '../../../../support/constants';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import DateTools from '../../../../support/utils/dateTools';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';

let user;
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewFileName;
let changedRecordsFileName;
const newLocationName = LOCATION_NAMES.ONLINE_UI;
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const instance = {
  title: `AT_C446087_FolioInstance_${getRandomPostfix()}`,
};

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.bulkEditQueryView.gui,
          permissions.bulkEditLogsView.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instance.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            instance.holdingTypeId = holdingTypes[0].id;
          });
          const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();

          instance.defaultLocation = Location.getDefaultLocation(servicePoint.id);
          Location.createViaApi(instance.defaultLocation);
          ServicePoints.getViaApi({ limit: 1 })
            .then((servicePoints) => {
              instance.servicepointId = servicePoints[0].id;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instance.instanceTypeId,
                  title: instance.title,
                },
                holdings: [
                  {
                    holdingsTypeId: instance.holdingTypeId,
                    permanentLocationId: instance.defaultLocation.id,
                  },
                ],
              }).then((instanceData) => {
                instance.id = instanceData.instanceId;
                instance.holdingId = instanceData.holdingIds[0].id;

                cy.getHoldings({
                  limit: 1,
                  query: `"instanceId"="${instance.id}"`,
                }).then((holdings) => {
                  instance.holdingHRID = holdings[0].hrid;
                });
              });
            });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
        Location.deleteInstitutionCampusLibraryLocationViaApi(
          instance.defaultLocation.institutionId,
          instance.defaultLocation.campusId,
          instance.defaultLocation.libraryId,
          instance.defaultLocation.id,
        );
        FileManager.deleteFileFromDownloadsByMask(
          identifiersQueryFilename,
          matchedRecordsQueryFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C446087 Verify generated Logs files for Holdings (Query) (firebird)',
        { tags: ['extendedPath', 'firebird', 'C446087'] },
        () => {
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.typeInAndSelectField(holdingsFieldValues.permanentLocation);
          QueryModal.verifyOperatorsList(enumOperators);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(instance.defaultLocation.name);
          QueryModal.verifyQueryAreaContent(
            `(permanent_location.name == ${instance.defaultLocation.name})`,
          );
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled();
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          BulkEditSearchPane.isHoldingsRadioChecked(true);
          BulkEditSearchPane.isBuildQueryButtonDisabled(true);

          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            identifiersQueryFilename = `Query-${interceptedUuid}.csv`;
            matchedRecordsQueryFileName = `${today}-Matched-Records-Query-${interceptedUuid}.csv`;
            previewFileName = `${today}-Updates-Preview-CSV-Query-${interceptedUuid}.csv`;
            changedRecordsFileName = `${today}-Changed-Records-CSV-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('1 holdings');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(permanent_location.name == ${instance.defaultLocation.name})`,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHRID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHRID,
            );
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(1);
            BulkEditActions.downloadMatchedResults();
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHRID,
            );
            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.checkHoldingsCheckbox();
            BulkEditLogs.verifyLogStatus(user.username, 'Data modification');
            BulkEditLogs.verifyEditingColumnValue(user.username, 'Query');
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.verifyLogsRowActionWhenRunQuery();

            // remove earlier dowloaded files
            FileManager.deleteFileFromDownloadsByMask(matchedRecordsQueryFileName);

            BulkEditSearchPane.openQuerySearch();
            BulkEditActions.openActions();
            BulkEditActions.openStartBulkEditForm();
            BulkEditActions.verifyRowIcons();
            BulkEditActions.replacePermanentLocation(newLocationName, 'holdings');
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyAreYouSureForm(1, LOCATION_NAMES.ONLINE_UI);
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instance.holdingHRID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              newLocationName,
            );
            BulkEditActions.downloadPreview();
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              newLocationName,
            );
            BulkEditActions.commitChanges();
            BulkEditSearchPane.waitFileUploading();
            BulkEditActions.verifySuccessBanner(1);
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              instance.holdingHRID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              newLocationName,
            );
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();
            BulkEditFiles.verifyValueInRowByUUID(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              newLocationName,
            );
            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.verifyCheckboxIsSelected('HOLDINGS_RECORD', true);
            BulkEditLogs.verifyLogStatus(user.username, 'Completed');
            BulkEditLogs.verifyEditingColumnValue(user.username, 'In app');
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.verifyLogsRowActionWhenCompletedWithQuery();
            BulkEditLogs.downloadQueryIdentifiers();
            ExportFile.verifyFileIncludes(identifiersQueryFilename, [instance.holdingId]);
            BulkEditFiles.verifyCSVFileRecordsNumber(identifiersQueryFilename, 1);
            BulkEditLogs.downloadFileWithMatchingRecords();
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingId,
            );
            BulkEditFiles.verifyCSVFileRowsRecordsNumber(matchedRecordsQueryFileName, 1);
            BulkEditLogs.downloadFileWithProposedChanges();
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              newLocationName,
            );
            BulkEditFiles.verifyCSVFileRowsRecordsNumber(previewFileName, 1);
            BulkEditLogs.downloadFileWithUpdatedRecords();
            BulkEditFiles.verifyValueInRowByUUID(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              newLocationName,
            );
            BulkEditFiles.verifyCSVFileRowsRecordsNumber(changedRecordsFileName, 1);
          });
        },
      );
    });
  });
});
