/* eslint-disable no-unused-expressions */
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import DateTools from '../../../../support/utils/dateTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  BULK_EDIT_FORMS,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import { getLongDelay } from '../../../../support/utils/cypressTools';

let user;
let queryFileNames;
const postfix = getRandomPostfix();
const marcInstance = {
  title: `AT_C663269_MarcInstance_${postfix}`,
};
const electronicAccessTableHeaders =
  'URL relationshipURILink textMaterial specifiedURL public note';
const electronicAccessTableHeadersInFile =
  'URL relationship;URI;Link text;Material specified;URL public note\n';
const electronicAccessFields = {
  uri: 'http://proxy.library.tamu.edu/login?url=http://congressional.proquest.com/congcomp/getdoc?SERIAL-SET-ID=12247+H.rp.1979',
  urlPublicNote: 'Connect to the full text of this electronic book',
  newUrlPublicNote:
    'Address for accessing the journal using authorization number and password through OCLC FirstSearch Electronic Collections Online. Subscription to online journal required for access to abstracts and full text',
};
const marcInstanceFields = [
  {
    tag: '006',
    content: {
      Type: 'm',
      Audn: '\\',
      Form: 'o',
      File: 'd',
      GPub: '\\',
    },
    isProtected: false,
  },
  {
    tag: '008',
    content: {
      Type: '\\',
      BLvl: '\\',
      DtSt: '\\',
      Date1: '1960',
      Date2: '\\\\\\\\',
      Ctry: '\\\\\\',
      Lang: '\\\\\\',
      MRec: '\\',
      Srce: '\\',
      Ills: ['\\', '\\', '\\', '\\'],
      Audn: '\\',
      Form: '\\',
      Cont: ['\\', '\\', '\\', '\\'],
      GPub: '\\',
      Conf: '\\',
      Fest: '\\',
      Indx: '\\',
      LitF: '\\',
      Biog: '\\',
    },
  },
  {
    tag: '245',
    content: `$a ${marcInstance.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '490',
    content: '$a H.rp.1979',
    indicators: ['0', '\\'],
  },
  {
    tag: '856',
    content: `$u ${electronicAccessFields.uri} $z ${electronicAccessFields.urlPublicNote}`,
    indicators: ['4', '0'],
  },
];
const seriesStatement = 'United States congressional serial set.';

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            marcInstance.uuid = instanceId;

            cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;
            });
          },
        );

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkInstanceRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.selectField(instanceFieldValues.date1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield('1960');
        QueryModal.addNewRow();
        QueryModal.selectField(instanceFieldValues.instanceSource, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.chooseValueSelect('MARC', 1);
        QueryModal.addNewRow();
        QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 2);
        QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 2);
        QueryModal.fillInValueTextfield(marcInstance.title, 2);
        cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
        cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
        QueryModal.clickTestQuery();
        QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();
        cy.wait('@getPreview', getLongDelay()).then((interception) => {
          const interceptedUuid = interception.request.url.match(
            /bulk-operations\/([a-f0-9-]+)\/preview/,
          )[1];
          queryFileNames = BulkEditFiles.getAllQueryDownloadedFileNames(interceptedUuid, true);
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
      BulkEditFiles.deleteAllDownloadedFiles(queryFileNames);
    });

    it(
      'C663269 Bulk edit marc fields (830, 856) for all records (MARC, Query) (firebird)',
      { tags: ['smoke', 'firebird', 'C663269'] },
      () => {
        BulkEditSearchPane.verifyBulkEditQueryPaneExists();
        BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('1 instance');
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
          '',
        );
        BulkEditSearchPane.verifyElectronicAccessColumnHeadersInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
          marcInstance.hrid,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, electronicAccessFields.uri);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '-');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(3, '-');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          4,
          electronicAccessFields.urlPublicNote,
        );
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          false,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
        );
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('830', '0', '\\', 'a');
        BulkEditActions.selectActionForMarcInstance('Add');
        BulkEditActions.verifySelectSecondActionRequired(false);
        BulkEditActions.fillInDataTextAreaForMarcInstance(seriesStatement);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('856', '4', '0', 'z', 1);
        BulkEditActions.findAndReplaceWithActionForMarc(
          electronicAccessFields.urlPublicNote,
          electronicAccessFields.newUrlPublicNote,
          1,
        );
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
          seriesStatement,
        );
        BulkEditSearchPane.verifyElectronicAccessColumnHeadersInForm(
          BULK_EDIT_FORMS.ARE_YOU_SURE,
          marcInstance.hrid,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          0,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
        );
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(1, electronicAccessFields.uri);
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(2, '-');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(3, '-');
        BulkEditSearchPane.verifyElectronicAccessElementByIndex(
          4,
          electronicAccessFields.newUrlPublicNote,
        );
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
        BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
        BulkEditActions.downloadPreviewInMarcFormat();

        const currentTimestampUpToMinutes = DateTools.getCurrentISO8601TimestampUpToMinutesUTC();
        const currentTimestampUpToMinutesOneMinuteAfter =
          DateTools.getCurrentISO8601TimestampUpToMinutesUTC(1);
        const assertionsOnMarcFileContent = [
          {
            uuid: marcInstance.uuid,
            assertions: [
              (record) => {
                expect(
                  record.get('005')[0].value.startsWith(currentTimestampUpToMinutes) ||
                    record
                      .get('005')[0]
                      .value.startsWith(currentTimestampUpToMinutesOneMinuteAfter),
                ).to.be.true;
              },

              (record) => expect(record.get('830')[0].ind1).to.eq('0'),
              (record) => expect(record.get('830')[0].ind2).to.eq(' '),
              (record) => expect(record.get('830')[0].subf[0][0]).to.eq('a'),
              (record) => expect(record.get('830')[0].subf[0][1]).to.eq(seriesStatement),

              (record) => expect(record.get('856')[0].ind1).to.eq('4'),
              (record) => expect(record.get('856')[0].ind2).to.eq('0'),
              (record) => expect(record.get('856')[0].subf[0][0]).to.eq('u'),
              (record) => expect(record.get('856')[0].subf[0][1]).to.eq(electronicAccessFields.uri),
              (record) => expect(record.get('856')[0].subf[1][0]).to.eq('z'),
              (record) => {
                expect(record.get('856')[0].subf[1][1]).to.eq(
                  electronicAccessFields.newUrlPublicNote,
                );
              },

              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];

        parseMrcFileContentAndVerify(
          queryFileNames.previewRecordsMarc,
          assertionsOnMarcFileContent,
          1,
        );

        const updatedHoldingElectronicAccessInFile = `${electronicAccessTableHeadersInFile}${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};${electronicAccessFields.uri};-;-;${electronicAccessFields.newUrlPublicNote}`;

        BulkEditActions.downloadPreview();
        FileManager.convertCsvToJson(queryFileNames.previewFileName).then((csvFileData) => {
          cy.expect(
            csvFileData[0][BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT],
          ).to.equal(seriesStatement);
          cy.expect(
            csvFileData[0][BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS],
          ).to.equal(updatedHoldingElectronicAccessInFile);
        });
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT,
          seriesStatement,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          `${electronicAccessTableHeaders}Resource${electronicAccessFields.uri}--${electronicAccessFields.newUrlPublicNote}`,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        FileManager.convertCsvToJson(queryFileNames.changedRecordsFileName).then((csvFileData) => {
          cy.expect(
            csvFileData[0][BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SERIES_STATEMENT],
          ).to.equal(seriesStatement);
          cy.expect(
            csvFileData[0][BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS],
          ).to.equal(updatedHoldingElectronicAccessInFile);
        });
        BulkEditActions.downloadChangedMarc();

        parseMrcFileContentAndVerify(
          queryFileNames.changedRecordsMarc,
          assertionsOnMarcFileContent,
          1,
        );

        const updateDate = DateTools.getFormattedEndDateWithTimUTC(new Date());

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.verifySeriesStatement(0, seriesStatement);
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
        InstanceRecordView.clickVersionHistoryButton();
        VersionHistorySection.waitLoading();
        VersionHistorySection.verifyListOfChanges([
          'Electronic access (Added)',
          'Series statements (Added)',
          'Electronic access (Removed)',
        ]);
        VersionHistorySection.verifyChangesAbsent(['Date 1', 'Date 2', 'Date type']);
        VersionHistorySection.clickCloseButton();
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource('830', `\t830\t0  \t$a ${seriesStatement} `);
        InventoryViewSource.verifyFieldInMARCBibSource(
          '856',
          `\t856\t4 0\t$u ${electronicAccessFields.uri} $z ${electronicAccessFields.newUrlPublicNote}`,
        );
        InventoryViewSource.verifyFieldContent(4, updateDate);
        InventoryViewSource.clickVersionHistoryButton();
        VersionHistorySection.waitLoading();
        VersionHistorySection.verifyListOfChanges([
          'Field 830 (Added)',
          'Field 856 (Edited)',
          'Field LDR (Edited)',
        ]);
      },
    );
  });
});
