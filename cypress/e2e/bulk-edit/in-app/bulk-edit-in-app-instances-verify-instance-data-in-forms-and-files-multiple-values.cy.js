import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  instanceIdentifiers,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceStatusType from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import NatureOfContent from '../../../support/fragments/settings/inventory/instances/natureOfContent';
import Formats from '../../../support/fragments/settings/inventory/instances/formats';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
const values = ['Test value one', 'Test value two'];
const instance = {
  title: `C423679 instance ${getRandomPostfix()}`,
  languages: ['eng', 'fre'],
  publicationFrequencies: ['daily', 'weekly'],
  publicationRanges: ['4', '3'],
};
const staffSuppressOption = 'Staff suppress';
const instancUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instancUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instancUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instancUUIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getAdminToken();
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instance.instanceTypeId = instanceTypeData[0].id;
          instance.instanceTypeName = instanceTypeData[0].name;
        });
        InstanceStatusType.getViaApi({ limit: 1 }).then((instanceStatusData) => {
          instance.statusTypeId = instanceStatusData[0].id;
          instance.statusTypeName = instanceStatusData[0].name;
        });
        NatureOfContent.getViaApi({ limit: 2 }).then(({ natureOfContentTerms }) => {
          instance.natureOfContentIds = natureOfContentTerms.map(({ id }) => id);
          instance.natureOfContentNames = natureOfContentTerms.map(({ name }) => name);
        });
        Formats.getViaApi({ limit: 2 })
          .then((formatData) => {
            instance.formatIds = formatData.map(({ id }) => id);
            instance.formatNames = formatData.map(({ name }) => name);
          })
          .then(() => {
            cy.createInstance({
              instance: {
                instanceTypeId: instance.instanceTypeId,
                title: instance.title,
                administrativeNotes: values,
                series: [{ value: values[0] }, { value: values[1] }],
                editions: values,
                physicalDescriptions: values,
                natureOfContentTermIds: instance.natureOfContentIds,
                instanceFormatIds: instance.formatIds,
                languages: instance.languages,
                publicationFrequency: instance.publicationFrequencies,
                publicationRange: instance.publicationRanges,
              },
            }).then((instanceId) => {
              instance.id = instanceId;
            });
          })
          .then(() => {
            cy.getInstanceById(instance.id).then((instanceData) => {
              instance.hrid = instanceData.hrid;
            });
          })
          .then(() => {
            FileManager.createFile(`cypress/fixtures/${instancUUIDsFileName}`, instance.id);
          });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instancUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C423679 Verify rendering Instance record data in bulk edit forms and files (fields with multiple values) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C423679'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.verifyRecordIdentifiers(instanceIdentifiers);
        BulkEditSearchPane.uploadFile(instancUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
          instance.title,
        );

        const checkedColumnHeadersWithValues = [
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID, instance.id],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY, 'false'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS, 'false'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PREVIOUSLY_HELD, 'false'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION, 'false'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID, instance.hrid],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE, 'FOLIO'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CATALOGED_DATE, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_STATUS_TERM, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.MODE_OF_ISSUANCE, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE, ''],
          [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            values.join(' | '),
          ],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE, instance.title],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INDEX_TITLE, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT, values.join(' | ')],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.EDITION, values.join(' | ')],
          [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PHYSICAL_DESCRIPTION,
            values.join(' | '),
          ],
          [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
            instance.instanceTypeName,
          ],
          [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.NATURE_OF_CONTENT,
            instance.natureOfContentNames.join(' | '),
          ],
          [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATS,
            instance.formatNames.join(' | '),
          ],
          [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
            instance.languages.join(' | '),
          ],
          [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION_FREQUENCY,
            instance.publicationFrequencies.join(' | '),
          ],
          [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION_RANGE,
            instance.publicationRanges.join(' | '),
          ],
        ];
        const checkedColumnHeaders = checkedColumnHeadersWithValues.map(
          (headerValuePair) => headerValuePair[0],
        );

        BulkEditActions.openActions();

        checkedColumnHeadersWithValues.forEach((checkedColumnHeader) => {
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(checkedColumnHeader[0]);
        });

        cy.wait(1000);
        BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();

        checkedColumnHeadersWithValues.forEach((checkedColumnHeaderWithValue) => {
          BulkEditSearchPane.verifyResultsUnderColumns(...checkedColumnHeaderWithValue);
        });

        BulkEditSearchPane.verifyColumnsInTableInExactOrder(checkedColumnHeaders);
        BulkEditActions.openActions();

        const stringOfHeaders = checkedColumnHeaders.join(',');
        const stringOfValues = checkedColumnHeadersWithValues
          .map((headerValuePair) => headerValuePair[1])
          .join(',');

        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [stringOfHeaders, stringOfValues]);
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.selectOption(staffSuppressOption);
        BulkEditSearchPane.verifyInputLabel(staffSuppressOption);
        BulkEditActions.selectSecondAction('Set true');
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          'true',
        );

        const checkedColumnHeadersWithEditedValues = checkedColumnHeadersWithValues.map((item) => {
          if (item[0] === BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS) {
            return [item[0], 'true'];
          }
          return item;
        });
        const stringOfEditedValues = checkedColumnHeadersWithEditedValues
          .map((headerValuePair) => headerValuePair[1])
          .join(',');

        checkedColumnHeadersWithEditedValues.forEach((checkedColumnHeaderWithEditedValue) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
            ...checkedColumnHeaderWithEditedValue,
          );
        });

        BulkEditSearchPane.verifyColumnsInAreYouSureFormInExactOrder(checkedColumnHeaders);
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [stringOfHeaders, stringOfEditedValues]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyPaneRecordsChangedCount('1 instance');
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          'true',
        );

        checkedColumnHeadersWithEditedValues.forEach((checkedColumnHeaderWithEditedValue) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByRowInPreviewRecordsChanged(
            ...checkedColumnHeaderWithEditedValue,
          );
        });

        BulkEditSearchPane.verifyColumnsInTableInExactOrder(checkedColumnHeaders);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          stringOfHeaders,
          stringOfEditedValues,
        ]);
      },
    );
  });
});
