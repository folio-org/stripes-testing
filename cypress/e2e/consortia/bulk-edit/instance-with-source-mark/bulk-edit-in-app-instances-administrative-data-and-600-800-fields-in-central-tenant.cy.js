import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  subjectsTableHeaders,
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
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  BULK_EDIT_FORMS,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import DateTools from '../../../../support/utils/dateTools';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

let user;
const marcInstance = {
  title: `AT_C651486_MarcInstance_${getRandomPostfix()}`,
};
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstance.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '600',
    content:
      '$a Pushkin, Aleksandr Sergeevich, $d 1799-1837 $x Museums $z Russia (Federation) $z Moscow $v Maps.',
    indicators: ['1', '0'],
  },
  {
    tag: '600',
    content: '$a Pushkin $d 1799-1837 $z Russia',
    indicators: ['1', '0'],
  },
  {
    tag: '800',
    content:
      '$a Armstrong, Louis, $d 1900-1971. $4 prf $t Louie Armstrong (Universal City Studios) ; $v 6.',
    indicators: ['1', '\\'],
  },
];
const statisticalCodeValue = 'ARL (Collection stats): books - Book, print (books)';
const subjectHeadings = `${subjectsTableHeaders.join(';')}\n`;
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName, true);
const previewFileNameMrc = BulkEditFiles.getPreviewMarcFileName(instanceUUIDsFileName, true);
const previewFileNameCsv = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName, true);
const changedRecordsFileNameMrc = BulkEditFiles.getChangedRecordsMarcFileName(
  instanceUUIDsFileName,
  true,
);
const changedRecordsFileNameCsv = BulkEditFiles.getChangedRecordsFileName(
  instanceUUIDsFileName,
  true,
);

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.bulkEditLogsView.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            marcInstance.uuid = instanceId;

            cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;

              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                marcInstance.uuid,
              );
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          previewFileNameMrc,
          previewFileNameCsv,
          changedRecordsFileNameMrc,
          changedRecordsFileNameCsv,
          matchedRecordsFileName,
          instanceUUIDsFileName,
        );
      });
      // Trillium
      it.skip(
        'C651486 ECS | Bulk edit administrative data and marc fields (600, 800) for all records in Central tenant (MARC, Logs) (consortia) (firebird)',
        { tags: [] },
        () => {
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
            'Armstrong, Louis, 1900-1971. Louie Armstrong (Universal City Studios) ; 6.',
          );
          BulkEditSearchPane.verifySubjectTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
            marcInstance.hrid,
            'Pushkin, Aleksandr Sergeevich, 1799-1837--Museums--Russia (Federation)--Moscow--Maps',
            'Library of Congress Subject Headings',
            'Personal name',
          );
          BulkEditSearchPane.verifySubjectTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
            marcInstance.hrid,
            'Pushkin 1799-1837--Russia',
            'Library of Congress Subject Headings',
            'Personal name',
            2,
          );
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
          );
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
          );
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
          BulkEditActions.selectOption(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
          );
          BulkEditActions.selectSecondAction('Add');
          BulkEditActions.verifySecondActionSelected('Add');
          BulkEditActions.fillInStatisticaCodeValue('book');
          BulkEditActions.verifyFilteredMultiSelectOptionsListIncludesOptionsWithText('book');
          BulkEditActions.selectStatisticalCodeValue(statisticalCodeValue);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('600', '1', '0', 'z');
          BulkEditActions.findAndRemoveSubfieldActionForMarc('Russia');
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(0);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('600', '1', '1', 'a', 1);
          BulkEditActions.selectActionForMarcInstance('Add', 1);
          BulkEditActions.fillInDataTextAreaForMarcInstance('Magellan, Ferdinand,', 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.selectSecondActionForMarcInstance('Additional subfield', 1);
          BulkEditActions.verifyAdditionalSubfieldRowInitialState(1);
          BulkEditActions.fillInSubfieldInSubRow('d', 1);
          BulkEditActions.fillInDataInSubRow('1521.', 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('800', '1', '\\', 't', 2);
          BulkEditActions.findAndReplaceWithActionForMarc('Armstrong', 'A', 2);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(2);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('800', '1', '\\', 'a', 3);
          BulkEditActions.addSubfieldActionForMarc('Negt, Oskar', 3);
          BulkEditActions.selectSecondActionForMarcInstance('Additional subfield', 3);
          BulkEditActions.fillInSubfieldInSubRow('t', 3);
          BulkEditActions.fillInDataInSubRow('Schriften.', 3);
          BulkEditActions.selectActionInSubRow('Additional subfield', 3);
          BulkEditActions.fillInSubfieldInSubRow('w', 3, 1);
          BulkEditActions.fillInDataInSubRow('(DE-101b)967682460.', 3, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

          const editedFieldHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              value: statisticalCodeValue,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
              value:
                'Armstrong, Louis 1900-1971. Louie A (Universal City Studios)  6. | Negt, Oskar Schriften. (DE-101b)967682460.',
            },
          ];
          const editedSubjectFieldHeaderValueInFile = {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
            value: `${subjectHeadings}Pushkin 1799-1837;Library of Congress Subject Headings;Personal name | Pushkin, Aleksandr Sergeevich, 1799-1837--Museums--Moscow--Maps.;Library of Congress Subject Headings;Personal name | Magellan, Ferdinand, 1521.;Library of Congress Children’s and Young Adults' Subject Headings;Personal name`,
          };

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            marcInstance.hrid,
            editedFieldHeaderValues,
          );

          const subjectTableValues = [
            ['Pushkin 1799-1837', 'Library of Congress Subject Headings', 'Personal name', 1],
            [
              'Pushkin, Aleksandr Sergeevich, 1799-1837--Museums--Moscow--Maps.',
              'Library of Congress Subject Headings',
              'Personal name',
              2,
            ],
            [
              'Magellan, Ferdinand, 1521.',
              "Library of Congress Children’s and Young Adults' Subject Headings",
              'Personal name',
              3,
            ],
          ];

          subjectTableValues.forEach((subject) => {
            BulkEditSearchPane.verifySubjectTableInForm(
              BULK_EDIT_FORMS.ARE_YOU_SURE,
              marcInstance.hrid,
              ...subject,
            );
          });

          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
          BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
          BulkEditActions.downloadPreviewInMarcFormat();

          const assertionsOnMarcFileContent = [
            {
              uuid: marcInstance.uuid,
              assertions: [
                (record) => {
                  expect(record.fields[4]).to.deep.eq([
                    '600',
                    '10',
                    'a',
                    'Pushkin',
                    'd',
                    '1799-1837',
                  ]);
                },
                (record) => {
                  expect(record.fields[5]).to.deep.eq([
                    '600',
                    '10',
                    'a',
                    'Pushkin, Aleksandr Sergeevich,',
                    'd',
                    '1799-1837',
                    'x',
                    'Museums',
                    'z',
                    'Moscow',
                    'v',
                    'Maps.',
                  ]);
                },
                (record) => {
                  expect(record.fields[6]).to.deep.eq([
                    '600',
                    '11',
                    'a',
                    'Magellan, Ferdinand,',
                    'd',
                    '1521.',
                  ]);
                },
                (record) => {
                  expect(record.fields[7]).to.deep.eq([
                    '800',
                    '1 ',
                    'a',
                    'Armstrong, Louis,',
                    'd',
                    '1900-1971.',
                    '4',
                    'prf',
                    't',
                    'Louie A (Universal City Studios) ;',
                    'v',
                    '6.',
                  ]);
                },
                (record) => {
                  expect(record.fields[8]).to.deep.eq([
                    '800',
                    '1 ',
                    'a',
                    'Negt, Oskar',
                    't',
                    'Schriften.',
                    'w',
                    '(DE-101b)967682460.',
                  ]);
                },
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
              ],
            },
          ];

          parseMrcFileContentAndVerify(previewFileNameMrc, assertionsOnMarcFileContent, 1);

          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            previewFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            [...editedFieldHeaderValues, editedSubjectFieldHeaderValueInFile],
          );
          BulkEditActions.commitChanges();

          const updateDate = DateTools.getFormattedEndDateWithTimUTC(new Date());

          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            editedFieldHeaderValues,
          );

          subjectTableValues.forEach((subject) => {
            BulkEditSearchPane.verifySubjectTableInForm(
              BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
              marcInstance.hrid,
              ...subject,
            );
          });

          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(changedRecordsFileNameMrc, assertionsOnMarcFileContent, 1);

          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            changedRecordsFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            [...editedFieldHeaderValues, editedSubjectFieldHeaderValueInFile],
          );

          // remove earlier downloaded files
          FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
          FileManager.deleteFileFromDownloadsByMask(
            previewFileNameMrc,
            previewFileNameCsv,
            changedRecordsFileNameMrc,
            changedRecordsFileNameCsv,
          );

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkInstancesCheckbox();
          BulkEditLogs.verifyLogStatus(user.username, 'Inventory - instances (MARC)');
          BulkEditLogs.verifyLogStatus(user.username, 'In app');
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompleted(true);
          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(instanceUUIDsFileName, [marcInstance.uuid]);
          BulkEditFiles.verifyCSVFileRecordsNumber(instanceUUIDsFileName, 1);
          BulkEditLogs.downloadFileWithMatchingRecords();
          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            previewFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            [...editedFieldHeaderValues, editedSubjectFieldHeaderValueInFile],
          );
          BulkEditLogs.downloadFileWithProposedChangesMarc();

          parseMrcFileContentAndVerify(previewFileNameMrc, assertionsOnMarcFileContent, 1);

          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            changedRecordsFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            [...editedFieldHeaderValues, editedSubjectFieldHeaderValueInFile],
          );
          BulkEditLogs.downloadFileWithUpdatedRecordsMarc();

          parseMrcFileContentAndVerify(changedRecordsFileNameMrc, assertionsOnMarcFileContent, 1);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          const seriesStatementValues = [
            'Armstrong, Louis, 1900-1971. Louie A (Universal City Studios) ; 6.',
            'Negt, Oskar Schriften. (DE-101b)967682460.',
          ];

          seriesStatementValues.forEach((value, index) => {
            InventoryInstance.verifySeriesStatement(index, value);
          });

          const listOfSubjects = [
            'Pushkin 1799-1837',
            'Pushkin, Aleksandr Sergeevich, 1799-1837--Museums--Moscow--Maps',
            'Magellan, Ferdinand, 1521',
          ];

          listOfSubjects.forEach((subject) => {
            InventoryInstance.verifySubjectHeading(subject);
          });

          InstanceRecordView.verifyStatisticalCodeTypeAndName(
            'ARL (Collection stats)',
            'Book, print (books)',
          );
          InstanceRecordView.viewSource();

          const marcFieldsToVerify = [
            ['$a Pushkin $d 1799-1837', 5],
            ['$a Pushkin, Aleksandr Sergeevich, $d 1799-1837 $x Museums $z Moscow $v Maps.', 6],
            ['$a Magellan, Ferdinand, $d 1521.', 7],
            [
              '$a Armstrong, Louis, $d 1900-1971. $4 prf $t Louie A (Universal City Studios) ; $v 6.',
              8,
            ],
            ['$a Negt, Oskar $t Schriften. $w (DE-101b)967682460.', 9],
          ];

          marcFieldsToVerify.forEach(([value, index]) => {
            InventoryViewSource.verifyExistanceOfValueInRow(value, index);
          });

          InventoryViewSource.verifyFieldContent(3, updateDate);
        },
      );
    });
  });
});
