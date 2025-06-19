import permissions from '../../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../../../support/constants';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import parseMrcFileContentAndVerify from '../../../../../support/utils/parseMrcFileContent';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';

let user;
const marcInstanceWithFields = {
  title: `AT_C651595_MarcInstance_${getRandomPostfix()}`,
};
const marcInstanceWithoutFields = {
  title: `AT_C651595_MarcInstance_${getRandomPostfix()}`,
};
const folioInstanceWithFields = {
  title: `AT_C651595_FolioInstance_${getRandomPostfix()}`,
};
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditInstances.gui,
  permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
];
const fieldsToEdit = {
  initialValues: {
    contributorsFieldValue: "Expo '70 (Osaka, Japan)",
    publicationFrequencyFieldValue: 'Monthly',
    publicationRangeFieldValue: 'Vol. 1 (Mar. 1980)-',
  },
  editedValues: {
    contributorsFieldValue: '',
    publicationFrequencyFieldValue: '',
    publicationRangeFieldValue: '',
  },
};
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '111',
    content: "$a Expo '70 $c (Osaka, Japan)",
    indicators: ['2', '\\'],
  },
  {
    tag: '245',
    content: `$a ${marcInstanceWithFields.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '310',
    content: '$a Monthly',
    indicators: ['\\', '\\'],
  },
  {
    tag: '362',
    content: '$a Vol. 1 (Mar. 1980)-',
    indicators: ['0', '\\'],
  },
  {
    tag: '362',
    content: '$a 1962-1965.',
    indicators: ['1', '\\'],
  },
];
const warningMessage = 'No change in MARC fields required';
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
        cy.createTempUser(userPermissions).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, userPermissions);

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields)
            .then((instanceId) => {
              marcInstanceWithFields.uuid = instanceId;

              cy.getInstanceById(marcInstanceWithFields.uuid).then((instanceData) => {
                marcInstanceWithFields.hrid = instanceData.hrid;

                cy.createSimpleMarcBibViaAPI(marcInstanceWithoutFields.title).then(
                  (instanceIdTwo) => {
                    marcInstanceWithoutFields.uuid = instanceIdTwo;

                    cy.getInstanceById(instanceIdTwo).then((secondInstanceData) => {
                      marcInstanceWithoutFields.hrid = secondInstanceData.hrid;
                    });
                  },
                );
              });
            })
            .then(() => {
              cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
                folioInstanceWithFields.instanceTypeId = instanceTypes[0].id;

                BrowseContributors.getContributorTypes().then((contributorTypeData) => {
                  // instance.contributorTypeId = contributorTypeData[0].id;
                  // instance.contributorTypeName = contributorTypeData[0].name;
                  cy.log(contributorTypeData);
                });

                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId: folioInstanceWithFields.instanceTypeId,
                    title: folioInstanceWithFields.title,
                    publicationFrequency: ['Monthly'],
                    publicationRange: ['Vol. 1 (Mar. 1980)-'],
                    contributors: [
                      {
                        name: fieldsToEdit.initialValues.contributorsFieldValue,
                        contributorNameTypeId: '',
                        primary: false,
                      },
                    ],
                  },
                }).then((instanceData) => {
                  folioInstanceWithFields.uuid = instanceData.instanceId;

                  cy.getInstanceById(instanceData.instanceId).then((folioInstanceData) => {
                    folioInstanceWithFields.hrid = folioInstanceData.hrid;

                    FileManager.createFile(
                      `cypress/fixtures/${instanceUUIDsFileName}`,
                      `${marcInstanceWithFields.uuid}\n${marcInstanceWithoutFields.uuid}`,
                    );
                  });
                });
              });
            });

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('3 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        cy.setTenant(Affiliations.College);

        [
          marcInstanceWithFields.uuid,
          marcInstanceWithoutFields.uuid,
          folioInstanceWithFields.uuid,
        ].forEach((uuid) => {
          InventoryInstance.deleteInstanceViaApi(uuid);
        });

        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          previewFileNameMrc,
          previewFileNameCsv,
          changedRecordsFileNameMrc,
          changedRecordsFileNameCsv,
          errorsFromCommittingFileName,
        );
      });

      it(
        'C651595 ECS | Bulk edit marc fields (111, 310, 362) for part of the records in Member tenant (MARC & FOLIO) (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C651595'] },
        () => {
          const columnsToShow = [
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.EDITION,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PHYSICAL_DESCRIPTION,
          ];

          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(...columnsToShow);
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
            marcInstanceWithFields.hrid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
                value: fieldsToEdit.initialValues.contributorsFieldValue,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.EDITION,
                value: fieldsToEdit.initialValues.editionFieldValue,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PHYSICAL_DESCRIPTION,
                value: fieldsToEdit.initialValues.physicalDescriptionFieldValue,
              },
            ],
          );

          const headerValuesInInstanceWithoutFields = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.EDITION,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PHYSICAL_DESCRIPTION,
              value: '',
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
            marcInstanceWithoutFields.hrid,
            headerValuesInInstanceWithoutFields,
          );
          BulkEditSearchPane.changeShowColumnCheckbox(...columnsToShow);
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(...columnsToShow);
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditMarcFieldsForm(
            instanceUUIDsFileName,
            '2 instance',
          );
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('100', '1', '\\', 'a');
          BulkEditActions.findAndAppendActionForMarc('Gresham', 'q', '(Geoffrey Austin)');
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('250', '\\', '\\', 'a', 1);
          BulkEditActions.findAndReplaceWithActionForMarc('ed', 'edition', 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('300', '\\', '\\', 'b', 2);
          BulkEditActions.findAndRemoveSubfieldActionForMarc('ill', 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          const editedHeaderValuesInInstanceWithFields = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
              value: fieldsToEdit.editedValues.contributorsFieldValue,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.EDITION,
              value: fieldsToEdit.editedValues.editionFieldValue,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PHYSICAL_DESCRIPTION,
              value: fieldsToEdit.editedValues.physicalDescriptionFieldValue,
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            marcInstanceWithFields.hrid,
            editedHeaderValuesInInstanceWithFields,
          );
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            marcInstanceWithoutFields.hrid,
            headerValuesInInstanceWithoutFields,
          );
          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);
          BulkEditActions.downloadPreviewInMarcFormat();

          const assertionsOnMarcFileContent = [
            {
              uuid: marcInstanceWithFields.uuid,
              assertions: [
                (record) => expect(record.leader).to.exist,
                (record) => expect(record.get('001')).to.not.be.empty,
                (record) => expect(record.get('005')).to.not.be.empty,
                (record) => expect(record.get('008')).to.not.be.empty,

                (record) => expect(record.get('100')[0].ind1).to.eq('1'),
                (record) => expect(record.get('100')[0].ind2).to.eq(' '),
                (record) => expect(record.get('100')[0].subf[0][0]).to.eq('a'),
                (record) => {
                  expect(record.get('100')[0].subf[0][1]).to.eq(
                    fieldsToEdit.initialValues.contributorsFieldValue,
                  );
                },
                (record) => expect(record.get('100')[0].subf[1][0]).to.eq('q'),
                (record) => expect(record.get('100')[0].subf[1][1]).to.eq('(Geoffrey Austin)'),

                (record) => expect(record.get('250')[0].ind1).to.eq(' '),
                (record) => expect(record.get('250')[0].ind2).to.eq(' '),
                (record) => expect(record.get('250')[0].subf[0][0]).to.eq('a'),
                (record) => {
                  expect(record.get('250')[0].subf[0][1]).to.eq(
                    fieldsToEdit.editedValues.editionFieldValue,
                  );
                },

                (record) => expect(record.get('300')[0].ind1).to.eq(' '),
                (record) => expect(record.get('300')[0].ind2).to.eq(' '),
                (record) => expect(record.get('300')[0].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('300')[0].subf[0][1]).to.eq('104 p. :'),
                (record) => expect(record.get('300')[0].subf[1][0]).to.eq('c'),
                (record) => expect(record.get('300')[0].subf[1][1]).to.eq('20 cm'),

                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => {
                  expect(record.get('999')[0].subf[0][1]).to.eq(marcInstanceWithFields.uuid);
                },
              ],
            },
            {
              uuid: marcInstanceWithoutFields.uuid,
              assertions: [
                (record) => expect(record.leader).to.exist,
                (record) => expect(record.get('001')).to.not.be.empty,
                (record) => expect(record.get('005')).to.not.be.empty,
                (record) => expect(record.get('008')).to.not.be.empty,
                (record) => expect(record.get('100')).to.be.empty,
                (record) => expect(record.get('250')).to.be.empty,
                (record) => expect(record.get('300')).to.be.empty,
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => {
                  expect(record.get('999')[0].subf[0][1]).to.eq(marcInstanceWithoutFields.uuid);
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(previewFileNameMrc, assertionsOnMarcFileContent, 2);

          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            previewFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstanceWithFields.hrid,
            editedHeaderValuesInInstanceWithFields,
          );
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            marcInstanceWithFields.hrid,
            editedHeaderValuesInInstanceWithFields,
          );
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
          BulkEditSearchPane.verifyError(marcInstanceWithoutFields.uuid, warningMessage, 'Warning');
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(
            changedRecordsFileNameMrc,
            [assertionsOnMarcFileContent[0]],
            1,
          );

          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            changedRecordsFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstanceWithFields.hrid,
            editedHeaderValuesInInstanceWithFields,
          );
          BulkEditFiles.verifyCSVFileRowsRecordsNumber(changedRecordsFileNameCsv, 1);
          BulkEditActions.downloadErrors();
          BulkEditFiles.verifyCSVFileRowsValueIncludes(errorsFromCommittingFileName, [
            `WARNING,${marcInstanceWithoutFields.uuid},${warningMessage}`,
          ]);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWithFields.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
          InstanceRecordView.verifyContributorNameWithoutMarcAppIcon(
            0,
            fieldsToEdit.editedValues.contributorsFieldValue,
          );
          InstanceRecordView.verifyEdition(fieldsToEdit.editedValues.editionFieldValue);
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource(
            '100',
            `$a ${fieldsToEdit.initialValues.contributorsFieldValue} $q (Geoffrey Austin)`,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '250',
            `$a ${fieldsToEdit.editedValues.editionFieldValue}`,
          );
          InventoryViewSource.verifyFieldInMARCBibSource('300', '$a 104 p. : $c 20 cm');
        },
      );
    });
  });
});
