/* eslint-disable quotes */
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import BulkEditSearchPane, {
  instanceIdentifiers,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import DateTools from '../../../support/utils/dateTools';
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
const value = `françaisolé~1234567890!@#$%^&*()-_=+[{]};:'<.>/?ユ简ثю`;
const instance = {
  title: `C423676 ${value}-${getRandomPostfix()}`,
  indexTitle: `Index title ${value}`,
};
const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const todayDateLocalized = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
const staffSuppressOption = 'Staff suppress';
const instanceHRIDsFileName = `instanceHRIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceHRIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceHRIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceHRIDsFileName);

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
        cy.getModesOfIssuance({ limit: 1 }).then((modeOfIssuanceData) => {
          instance.modeOfIssuanceId = modeOfIssuanceData.id;
          instance.modeOfIssuanceName = modeOfIssuanceData.name;
        });
        BrowseContributors.getContributorTypes().then((contributorTypeData) => {
          instance.contributorTypeId = contributorTypeData[0].id;
          instance.contributorTypeName = contributorTypeData[0].name;
        });
        NatureOfContent.getViaApi({ limit: 1 }).then(({ natureOfContentTerms }) => {
          instance.natureOfContentId = natureOfContentTerms[0].id;
          instance.natureOfContentName = natureOfContentTerms[0].name;
        });
        Formats.getViaApi()
          .then((formatData) => {
            instance.formatId = formatData[0].id;
            instance.formatName = formatData[0].name;
          })
          .then(() => {
            cy.createInstance({
              instance: {
                instanceTypeId: instance.instanceTypeId,
                title: instance.title,
                catalogedDate: todayDate,
                statusId: instance.statusTypeId,
                modeOfIssuanceId: instance.modeOfIssuanceId,
                administrativeNotes: [value],
                indexTitle: instance.indexTitle,
                series: [{ value }],
                contributors: [
                  {
                    name: value,
                    contributorNameTypeId: instance.contributorTypeId,
                    contributorTypeText: '',
                    primary: false,
                  },
                ],
                editions: [value],
                physicalDescriptions: [value],
                natureOfContentTermIds: [instance.natureOfContentId],
                instanceFormatIds: [instance.formatId],
                languages: ['eng'],
                publicationFrequency: ['daily'],
                publicationRange: ['4'],
              },
            }).then((instanceId) => {
              instance.id = instanceId;
            });
          })
          .then(() => {
            cy.getInstanceById(instance.id).then((instanceData) => {
              instance.hrid = instanceData.hrid;
              instanceData.discoverySuppress = true;
              instanceData.staffSuppress = true;
              instanceData.previouslyHeld = true;
              cy.updateInstance(instanceData);
            });
          })
          .then(() => {
            FileManager.createFile(`cypress/fixtures/${instanceHRIDsFileName}`, instance.hrid);
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
      FileManager.deleteFile(`cypress/fixtures/${instanceHRIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C423676 Verify rendering Instance record data in bulk edit forms and files (fields with single value) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C423676'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance HRIDs');
        BulkEditSearchPane.verifyRecordIdentifiers(instanceIdentifiers);
        BulkEditSearchPane.uploadFile(instanceHRIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
          instance.title,
        );

        const checkedColumnHeadersWithValues = [
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID, instance.id],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY, 'true'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS, 'true'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PREVIOUSLY_HELD, 'true'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION, 'false'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID, instance.hrid],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE, 'FOLIO'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CATALOGED_DATE, todayDateLocalized],
          [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_STATUS_TERM,
            instance.statusTypeName,
          ],
          [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.MODE_OF_ISSUANCE,
            instance.modeOfIssuanceName,
          ],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE, value],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE, instance.title],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INDEX_TITLE, instance.indexTitle],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT, value],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS, value],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION, ''],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.EDITION, value],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PHYSICAL_DESCRIPTION, value],
          [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
            instance.instanceTypeName,
          ],
          [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.NATURE_OF_CONTENT,
            instance.natureOfContentName,
          ],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATS, instance.formatName],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES, 'eng'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION_FREQUENCY, 'daily'],
          [BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION_RANGE, '4'],
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
        // replace the date because in the .csv file format of date is 'YYYY-MM-DD'
        const stringOfValues = checkedColumnHeadersWithValues
          .map((headerValuePair) => headerValuePair[1])
          .join(',')
          .replace(todayDateLocalized, todayDate);

        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [stringOfHeaders, stringOfValues]);
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.selectOption(staffSuppressOption);
        BulkEditSearchPane.verifyInputLabel(staffSuppressOption);
        BulkEditActions.selectSecondAction('Set false');
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          'false',
        );

        const checkedColumnHeadersWithEditedValues = checkedColumnHeadersWithValues.map((item) => {
          if (item[0] === BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS) {
            return [item[0], 'false'];
          }
          return item;
        });
        // replace the date because in the .csv file format of date is 'YYYY-MM-DD'
        const stringOfEditedValues = checkedColumnHeadersWithEditedValues
          .map((headerValuePair) => headerValuePair[1])
          .join(',')
          .replace(todayDateLocalized, todayDate);

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
          'false',
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
