import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_FORMS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
} from '../../../../support/utils/parseMrcFileContent';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
let instanceTypeId;
const marcInstanceWith656And691 = {
  title: `AT_C656334_MarcInstanceWith656And691_${getRandomPostfix()}`,
};
const marcInstanceWithout656And691 = {
  title: `AT_C656334_MarcInstanceWithout656And691_${getRandomPostfix()}`,
};
const marcInstanceSuppressed = {
  title: `AT_C656334_MarcInstanceSuppressed_${getRandomPostfix()}`,
};
const folioInstance = {
  title: `AT_C656334_FolioInstance_${getRandomPostfix()}`,
};
const instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const subjectTableHeadersInFile = 'Subject headings;Subject source;Subject type\n';

const marcFieldsForInstanceWith656And691 = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstanceWith656And691.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '650',
    content: '$aEducational buildings$zWashington (D.C.)$y1890-1910.$2lcsh',
    indicators: ['\\', '7'],
  },
  {
    tag: '656',
    content: '$aIllegal aliens$2[thesaurus code]',
    indicators: ['\\', '7'],
  },
  {
    tag: '691',
    content: '$aLocal subject$gMiscellaneous information',
    indicators: ['\\', '\\'],
  },
];

const marcFieldsForInstanceWithout656And691 = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstanceWithout656And691.title}`,
    indicators: ['1', '0'],
  },
];

const marcFieldsForInstanceSuppressed = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstanceSuppressed.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '650',
    content: '$aEducational buildings$zWashington (D.C.)$y1890-1910.$2lcsh',
    indicators: ['\\', '7'],
  },
  {
    tag: '656',
    content: '$aIllegal aliens$2[thesaurus code]',
    indicators: ['\\', '7'],
  },
  {
    tag: '691',
    content: '$aLocal subject$gMiscellaneous information',
    indicators: ['\\', '\\'],
  },
];

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
        })
        .then(() => {
          // Create MARC instance with 656 and 691 fields
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcFieldsForInstanceWith656And691,
          ).then((instanceId) => {
            marcInstanceWith656And691.uuid = instanceId;

            cy.getInstanceById(instanceId).then((instanceData) => {
              marcInstanceWith656And691.hrid = instanceData.hrid;
            });
          });

          // Create MARC instance without 656 and 691 fields
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcFieldsForInstanceWithout656And691,
          ).then((instanceId) => {
            marcInstanceWithout656And691.uuid = instanceId;

            cy.getInstanceById(instanceId).then((instanceData) => {
              marcInstanceWithout656And691.hrid = instanceData.hrid;
            });
          });

          // Create suppressed MARC instance with 656 and 691 fields
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcFieldsForInstanceSuppressed,
          ).then((instanceId) => {
            marcInstanceSuppressed.uuid = instanceId;

            cy.getInstanceById(instanceId).then((instanceData) => {
              marcInstanceSuppressed.hrid = instanceData.hrid;
              instanceData.discoverySuppress = true;
              cy.updateInstance(instanceData);
            });
          });

          // Create FOLIO instance (suppressed)
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: folioInstance.title,
              discoverySuppress: true,
            },
          }).then((createdInstanceData) => {
            folioInstance.uuid = createdInstanceData.instanceId;
            folioInstance.hrid = createdInstanceData.instanceHrid;
          });
        })
        .then(() => {
          FileManager.createFile(
            `cypress/fixtures/${instanceUUIDsFileName}`,
            `${marcInstanceWith656And691.uuid}\n${marcInstanceWithout656And691.uuid}\n${marcInstanceSuppressed.uuid}\n${folioInstance.uuid}`,
          );

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('4 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(marcInstanceWith656And691.uuid);
      InventoryInstance.deleteInstanceViaApi(marcInstanceWithout656And691.uuid);
      InventoryInstance.deleteInstanceViaApi(marcInstanceSuppressed.uuid);
      InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C656334 Bulk edit administrative data and marc fields (656, 691) for part of the records (MARC & FOLIO) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C656334'] },
      () => {
        // Step 1: Check "Subject" column
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
        );

        // Verify Subject column appeared with expected values for instances with 656 field
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
        );

        // Verify Subject data for instances with 650 and 656 fields
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
          marcInstanceWith656And691.hrid,
          'Educational buildings--Washington (D.C.)--1890-1910',
          'Library of Congress Subject Headings',
          'Topical term',
        );
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
          marcInstanceWith656And691.hrid,
          'Illegal aliens',
          '-',
          'Occupation',
        );
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
          marcInstanceSuppressed.hrid,
          'Educational buildings--Washington (D.C.)--1890-1910',
          'Library of Congress Subject Headings',
          'Topical term',
        );
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
          marcInstanceSuppressed.hrid,
          'Illegal aliens',
          '-',
          'Occupation',
        );

        // Step 2: Uncheck "Subject" and "Suppress from discovery" columns
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
        );
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        );

        // Step 3: Open combined bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
        BulkEditActions.verifyInitialStateBulkEditMarcFieldsForm(
          instanceUUIDsFileName,
          '4 instance',
        );

        // Step 4: Set Suppress from discovery = false
        BulkEditActions.selectOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        );
        BulkEditActions.selectAction(BULK_EDIT_ACTIONS.SET_FALSE);
        BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(false);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 5: Configure MARC edit for 656 field - Find and Replace
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('656', '\\', '7', 'a');
        BulkEditActions.findAndReplaceWithActionForMarc('Illegal aliens', 'Noncitizens');
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 6: Add second MARC edit for 691 field - Find and Remove subfield
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('691', '\\', '\\', 'g', 1);
        BulkEditActions.findAndRemoveSubfieldActionForMarc('Miscellaneous information', 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 7: Confirm changes and verify "Are you sure?" form
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(3);
        BulkEditActions.verifyMessageBannerInAreYouSureFormWhenSourceNotSupportedByMarc(3, 1);

        // Verify changes in preview - Suppress from discovery and Subject
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstanceWith656And691.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'false',
        );
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.ARE_YOU_SURE,
          marcInstanceWith656And691.hrid,
          'Educational buildings Washington (D.C.) 1890-1910.',
          'Library of Congress Subject Headings',
          'Topical term',
        );
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.ARE_YOU_SURE,
          marcInstanceWith656And691.hrid,
          'Noncitizens',
          '-',
          'Occupation',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstanceSuppressed.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'false',
        );
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.ARE_YOU_SURE,
          marcInstanceSuppressed.hrid,
          'Educational buildings Washington (D.C.) 1890-1910.',
          'Library of Congress Subject Headings',
          'Topical term',
        );
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.ARE_YOU_SURE,
          marcInstanceSuppressed.hrid,
          'Noncitizens',
          '-',
          'Occupation',
        );

        // Step 8: Download preview in MARC format
        BulkEditActions.downloadPreviewInMarcFormat();
        const assertionsOnMarcFileContent = [
          {
            uuid: marcInstanceWith656And691.uuid,
            assertions: [
              (record) => {
                verifyMarcFieldByTag(record, '650', {
                  ind1: ' ',
                  ind2: '7',
                  subfields: [
                    ['a', 'Educational buildings'],
                    ['z', 'Washington (D.C.)'],
                    ['y', '1890-1910.'],
                    ['2', 'lcsh'],
                  ],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '656', {
                  ind1: ' ',
                  ind2: '7',
                  subfields: [
                    ['a', 'Noncitizens'],
                    ['2', '[thesaurus code]'],
                  ],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '691', {
                  ind1: ' ',
                  ind2: ' ',
                  subf: ['a', 'Local subject'],
                });
              },
            ],
          },
          {
            uuid: marcInstanceSuppressed.uuid,
            assertions: [
              (record) => {
                verifyMarcFieldByTag(record, '650', {
                  ind1: ' ',
                  ind2: '7',
                  subfields: [
                    ['a', 'Educational buildings'],
                    ['z', 'Washington (D.C.)'],
                    ['y', '1890-1910.'],
                    ['2', 'lcsh'],
                  ],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '656', {
                  ind1: ' ',
                  ind2: '7',
                  subfields: [
                    ['a', 'Noncitizens'],
                    ['2', '[thesaurus code]'],
                  ],
                });
              },
              (record) => {
                verifyMarcFieldByTag(record, '691', {
                  ind1: ' ',
                  ind2: ' ',
                  subf: ['a', 'Local subject'],
                });
              },
            ],
          },
        ];
        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 3);

        // Step 9: Download preview in CSV format
        BulkEditActions.downloadPreview();

        // Prepare Subject data for CSV verification
        const marcInstanceSubjectInFile = `${subjectTableHeadersInFile}Educational buildings Washington (D.C.) 1890-1910.;Library of Congress Subject Headings;Topical term | Noncitizens;-;Occupation`;

        // Verify Suppress from discovery
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWith656And691.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          false,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithout656And691.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          false,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceSuppressed.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          false,
        );

        // Verify Subject column
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWith656And691.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          marcInstanceSubjectInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithout656And691.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceSuppressed.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          marcInstanceSubjectInFile,
        );

        // Step 10: Commit changes
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaginatorInChangedRecords(2);
        BulkEditActions.verifySuccessBanner(2);
        BulkEditSearchPane.verifyPaneRecordsChangedCount('2 instance');

        // Verify changes in confirmation screen - Suppress from discovery and Subject
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstanceWith656And691.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'false',
        );
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
          marcInstanceWith656And691.hrid,
          'Educational buildings Washington (D.C.) 1890-1910.',
          'Library of Congress Subject Headings',
          'Topical term',
        );
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
          marcInstanceWith656And691.hrid,
          'Noncitizens',
          '-',
          'Occupation',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstanceSuppressed.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'false',
        );
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
          marcInstanceSuppressed.hrid,
          'Educational buildings Washington (D.C.) 1890-1910.',
          'Library of Congress Subject Headings',
          'Topical term',
        );
        BulkEditSearchPane.verifySubjectTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
          marcInstanceSuppressed.hrid,
          'Noncitizens',
          '-',
          'Occupation',
        );

        // Step 11: Verify Errors & warnings accordion
        BulkEditSearchPane.verifyErrorLabel(1, 3);
        BulkEditSearchPane.verifyErrorByIdentifier(
          folioInstance.uuid,
          ERROR_MESSAGES.FOLIO_SOURCE_NOT_SUPPORTED_BY_MARC_BULK_EDIT,
        );
        BulkEditSearchPane.verifyShowWarningsCheckbox(false, false);
        BulkEditSearchPane.clickShowWarningsCheckbox();
        BulkEditSearchPane.verifyErrorByIdentifier(
          marcInstanceWith656And691.uuid,
          ERROR_MESSAGES.NO_CHANGE_IN_ADMINISTRATIVE_DATA_REQUIRED,
          'Warning',
        );
        BulkEditSearchPane.verifyErrorByIdentifier(
          marcInstanceWithout656And691.uuid,
          ERROR_MESSAGES.NO_CHANGE_IN_ADMINISTRATIVE_DATA_REQUIRED,
          'Warning',
        );
        BulkEditSearchPane.verifyErrorByIdentifier(
          marcInstanceWithout656And691.uuid,
          ERROR_MESSAGES.NO_CHANGE_IN_MARC_FIELDS_REQUIRED,
          'Warning',
        );

        // Step 12: Download changed records (MARC)
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, assertionsOnMarcFileContent, 2);

        // Step 13: Download changed records (CSV)
        BulkEditActions.downloadChangedCSV();

        // Verify Suppress from discovery
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWith656And691.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          false,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceSuppressed.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          false,
        );

        // Verify Subject column
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWith656And691.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          marcInstanceSubjectInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceSuppressed.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          marcInstanceSubjectInFile,
        );

        // Step 14: Download errors (CSV)
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
          `ERROR,${folioInstance.uuid},${ERROR_MESSAGES.FOLIO_SOURCE_NOT_SUPPORTED_BY_MARC_BULK_EDIT}`,
          `WARNING,${marcInstanceWith656And691.uuid},${ERROR_MESSAGES.NO_CHANGE_IN_ADMINISTRATIVE_DATA_REQUIRED}`,
          `WARNING,${marcInstanceWithout656And691.uuid},${ERROR_MESSAGES.NO_CHANGE_IN_ADMINISTRATIVE_DATA_REQUIRED}`,
          `WARNING,${marcInstanceWithout656And691.uuid},${ERROR_MESSAGES.NO_CHANGE_IN_MARC_FIELDS_REQUIRED}`,
        ]);

        // Step 15: Verify edited MARC instance in Inventory
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

        [marcInstanceWith656And691.title, marcInstanceSuppressed.title].forEach((title) => {
          InventorySearchAndFilter.searchInstanceByTitle(title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          // Verify unsuppressed and Subject updated
          InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery(false);
          InstanceRecordView.verifyInstanceSubject({
            indexRow: 0,
            subjectHeadings: 'Educational buildings--Washington (D.C.)--1890-1910',
            subjectSource: 'Library of Congress Subject Headings',
            subjectType: 'Topical term',
          });
          InstanceRecordView.verifyInstanceSubject({
            indexRow: 1,
            subjectHeadings: 'Noncitizens',
            subjectSource: 'No value set-',
            subjectType: 'Occupation',
          });

          // Step 16: View source and verify MARC changes
          InventoryInstance.viewSource();
          InventoryViewSource.contains(
            '650\t  7\t$a Educational buildings $z Washington (D.C.) $y 1890-1910. $2 lcsh',
          );
          InventoryViewSource.contains('656\t  7\t$a Noncitizens $2 [thesaurus code]');
          InventoryViewSource.contains('691\t   \t$a Local subject');
          InventoryViewSource.notContains('$g Miscellaneous information');
          InventoryViewSource.close();
          InventorySearchAndFilter.resetAll();
        });

        // Step 17: Verify FOLIO instance not changed
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery(true);
      },
    );
  });
});
