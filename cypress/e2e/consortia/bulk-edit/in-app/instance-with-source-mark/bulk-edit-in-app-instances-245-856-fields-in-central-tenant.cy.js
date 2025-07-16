/* eslint-disable no-unused-expressions */
import permissions from '../../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../../support/fragments/bulk-edit/bulk-edit-files';
import DateTools from '../../../../../support/utils/dateTools';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { tenantNames } from '../../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  BULK_EDIT_FORMS,
} from '../../../../../support/constants';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import parseMrcFileContentAndVerify from '../../../../../support/utils/parseMrcFileContent';
import UrlRelationship from '../../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import ExportFile from '../../../../../support/fragments/data-export/exportFile';

let user;
let instanceTypeId;
let urlRelationshipId;
const titlePostfix = getRandomPostfix();
const instanceTitle = `AT_C651495_Tōn Diōnos Rōmaikōn historiōn eikositria biblia =_${titlePostfix}`;
const addedSubfield = 'Dionis Romanarum historiarum libri XXIII, à XXXVI ad LVIII vsque.';
const marcInstance = {
  newTitle: `${instanceTitle} ${addedSubfield}`,
};
const folioInstance = {};
const electronicAccessFields = {
  uri: 'www.koreascience.or.kr/journal/E1TAAE/v2n1.page www.ksiam.org',
  newUri: 'http://www.koreascience.or.kr/journal/E1TAAE/v2n1.page http://www.ksiam.org',
};
const electronicAccessTableHeadersInFile =
  'URL relationship;URI;Link text;Materials specified;URL public note\n';
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${instanceTitle}`,
    indicators: ['1', '5'],
  },
  {
    tag: '856',
    content:
      '$h http://mathnet.kaist.ac.kr $u www.koreascience.or.kr/journal/E1TAAE/v2n1.page $u www.ksiam.org',
    indicators: ['4', '0'],
  },
];
const errorMessage =
  'Instance with source FOLIO is not supported by MARC records bulk edit and cannot be updated.';
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
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
const errorsFromCommittingFileName = BulkEditFiles.getErrorsFromCommittingFileName(
  instanceUUIDsFileName,
  true,
);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
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

              cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                instanceTypeId = instanceTypeData[0].id;

                UrlRelationship.getViaApi({
                  query: `name=="${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE}"`,
                }).then((urlRelationshipData) => {
                  urlRelationshipId = urlRelationshipData[0].id;

                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId,
                      title: instanceTitle,
                      electronicAccess: [
                        {
                          uri: electronicAccessFields.uri,
                          relationshipId: urlRelationshipId,
                        },
                      ],
                    },
                  }).then((createdInstanceData) => {
                    folioInstance.uuid = createdInstanceData.instanceId;

                    cy.getInstanceById(folioInstance.uuid).then((folioInstanceData) => {
                      folioInstance.hrid = folioInstanceData.hrid;
                    });

                    FileManager.createFile(
                      `cypress/fixtures/${instanceUUIDsFileName}`,
                      `${marcInstance.uuid}\r\n${folioInstance.uuid}`,
                    );
                  });
                });
              });
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
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          previewFileNameCsv,
          previewFileNameMrc,
          changedRecordsFileNameMrc,
          changedRecordsFileNameCsv,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C651495 ECS | Bulk edit marc fields (245, 856) for all records in Central tenant (MARC & FOLIO) (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C651495'] },
        () => {
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
          );

          const instanceHrids = [marcInstance.hrid, folioInstance.hrid];

          instanceHrids.forEach((hrid) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
              instanceTitle,
            );
            BulkEditSearchPane.verifyElectronicAccessTableInForm(
              BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
              hrid,
              ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
              electronicAccessFields.uri,
              '-',
              '-',
              '-',
            );
          });

          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          );
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('245', '1', '5', 'a');
          BulkEditActions.findAndAppendActionForMarc(
            'historiōn eikositria biblia',
            'b',
            addedSubfield,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('856', '4', '0', 'u', 1);
          BulkEditActions.findAndReplaceWithActionForMarc('www', 'http://www', 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureFormWhenSourceNotSupportedByMarc(1, 1);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
            marcInstance.newTitle,
          );
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.ARE_YOU_SURE,
            marcInstance.hrid,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            electronicAccessFields.newUri,
            '-',
            '-',
            '-',
          );
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
          BulkEditSearchPane.verifyPreviousPaginationButtonInAreYouSureFormDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonInAreYouSureFormDisabled();
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
                (record) => expect(record.get('008')).to.not.be.empty,
                (record) => expect(record.get('245')[0].ind1).to.eq('1'),
                (record) => expect(record.get('245')[0].ind2).to.eq('5'),
                (record) => expect(record.get('245')[0].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('245')[0].subf[0][1]).to.eq(instanceTitle),
                (record) => expect(record.get('245')[0].subf[1][0]).to.eq('b'),
                (record) => expect(record.get('245')[0].subf[1][1]).to.eq(addedSubfield),

                (record) => expect(record.get('856')[0].ind1).to.eq('4'),
                (record) => expect(record.get('856')[0].ind2).to.eq('0'),
                (record) => expect(record.get('856')[0].subf[0][0]).to.eq('h'),
                (record) => expect(record.get('856')[0].subf[0][1]).to.eq('http://mathnet.kaist.ac.kr'),
                (record) => expect(record.get('856')[0].subf[1][0]).to.eq('u'),
                (record) => {
                  expect(record.get('856')[0].subf[1][1]).to.eq(
                    'http://www.koreascience.or.kr/journal/E1TAAE/v2n1.page',
                  );
                },
                (record) => expect(record.get('856')[0].subf[2][0]).to.eq('u'),
                (record) => {
                  expect(record.get('856')[0].subf[2][1]).to.eq('http://www.ksiam.org');
                },

                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
              ],
            },
          ];

          parseMrcFileContentAndVerify(previewFileNameMrc, assertionsOnMarcFileContent, 1);

          const updatedElectronicAccessInFile = `${electronicAccessTableHeadersInFile}${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};${electronicAccessFields.newUri};-;-;-`;

          BulkEditActions.downloadPreview();

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
              value: marcInstance.newTitle,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
              value: updatedElectronicAccessInFile,
            },
          ];

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            previewFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            editedHeaderValues,
          );
          BulkEditFiles.verifyCSVFileRowsRecordsNumber(previewFileNameCsv, 1);
          BulkEditActions.commitChanges();

          const updateDate = DateTools.getFormattedEndDateWithTimUTC(new Date());

          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
                value: marcInstance.newTitle,
              },
            ],
          );
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
            marcInstance.hrid,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            electronicAccessFields.newUri,
            '-',
            '-',
            '-',
          );
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
          BulkEditSearchPane.verifyError(folioInstance.uuid, errorMessage);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(changedRecordsFileNameMrc, assertionsOnMarcFileContent, 1);

          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            changedRecordsFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            editedHeaderValues,
          );
          BulkEditFiles.verifyCSVFileRowsRecordsNumber(changedRecordsFileNameCsv, 1);
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            `ERROR,${folioInstance.uuid},${errorMessage}`,
          ]);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.uuid);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceIsOpened(instanceTitle);
          InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
          InstanceRecordView.verifyElectronicAccess(electronicAccessFields.newUri);
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource(
            '245',
            `$a ${instanceTitle} $b ${addedSubfield}`,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '856',
            '$h http://mathnet.kaist.ac.kr $u http://www.koreascience.or.kr/journal/E1TAAE/v2n1.page $u http://www.ksiam.org',
          );
          InventoryViewSource.verifyFieldContent(3, updateDate);
          InventoryViewSource.close();
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.searchInstanceByTitle(folioInstance.uuid);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceIsOpened(instanceTitle);
          InstanceRecordView.verifyElectronicAccess(electronicAccessFields.uri);
        },
      );
    });
  });
});
