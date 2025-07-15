/* eslint-disable no-unused-expressions */
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import DateTools from '../../../../support/utils/dateTools';

let user;
let locationId;
let materialTypeId;
let loanTypeId;
let sourceId;
const marcInstance = {
  title: `AT_C651599_MarcInstance_${getRandomPostfix()}`,
};
const marcInstanceWithHoldingAndItem = {
  title: `AT_C651599_MarcInstanceWithHoldingAndItem_${getRandomPostfix()}`,
};
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '110',
    content: '$a United States. $b Congress. $b Joint Committee on the Library.',
    indicators: ['1', '\\'],
  },
  {
    tag: '245',
    content: `$a ${marcInstance.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '336',
    content: '$a performed music $2 rdacontent',
    indicators: ['\\', '\\'],
  },
  {
    tag: '338',
    content: '$a online resource $b cr $2 rdacarrier',
    indicators: ['\\', '\\'],
  },
];
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

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

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditInstances.gui,
            permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]);
          cy.resetTenant();

          // Create first shared MARC instance
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            marcInstance.uuid = instanceId;

            cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;
            });
          });
          // Create second shared MARC instance
          cy.createSimpleMarcBibViaAPI(marcInstanceWithHoldingAndItem.title).then((instanceId2) => {
            marcInstanceWithHoldingAndItem.uuid = instanceId2;

            cy.getInstanceById(marcInstanceWithHoldingAndItem.uuid).then((instanceData2) => {
              marcInstanceWithHoldingAndItem.hrid = instanceData2.hrid;
            });
          });
          // Create holding and item for the second instance in member tenant
          cy.setTenant(Affiliations.College);

          cy.getLocations({ limit: 1 }).then((locationRes) => {
            locationId = locationRes.id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((materialTypeRes) => {
            materialTypeId = materialTypeRes.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });
          cy.getLoanTypes({ limit: 1 })
            .then((loanTypeRes) => {
              loanTypeId = loanTypeRes[0].id;
            })
            .then(() => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: marcInstanceWithHoldingAndItem.uuid,
                permanentLocationId: locationId,
                sourceId,
              })
                .then((holding) => {
                  marcInstanceWithHoldingAndItem.holdingId = holding.id;
                })
                .then(() => {
                  InventoryItems.createItemViaApi({
                    holdingsRecordId: marcInstanceWithHoldingAndItem.holdingId,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: 'Available' },
                  }).then((item) => {
                    marcInstanceWithHoldingAndItem.itemId = item.id;
                  });
                  // Create .csv file with both instance UUIDs
                  FileManager.createFile(
                    `cypress/fixtures/${instanceUUIDsFileName}`,
                    `${marcInstance.uuid}\n${marcInstanceWithHoldingAndItem.uuid}`,
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
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.deleteItemViaApi(marcInstanceWithHoldingAndItem.itemId);
        cy.deleteHoldingRecordViaApi(marcInstanceWithHoldingAndItem.holdingId);
        cy.resetTenant();

        [marcInstance, marcInstanceWithHoldingAndItem].forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C651599 ECS | Bulk edit administrative data and marc fields (110, 336, 338) for part of the records in Central tenant (MARC) (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C651599'] },
        () => {
          // Step 1: Show columns Contributors, Resource type, Formats
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATS,
          );
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
                value: 'United States. Congress. Joint Committee on the Library',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
                value: 'performed music',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATS,
                value: 'computer -- online resource',
              },
            ],
          );

          // Step 2: Hide columns Suppress from discovery, Contributors, Resource type, Formats
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATS,
          );

          // Step 3: Open combined bulk edit form for administrative data and MARC
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

          // Step 4: Set Suppress from discovery = true, checkboxes checked by default
          BulkEditActions.selectOption(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          );
          BulkEditActions.selectSecondAction('Set true');
          // Step 5: Uncheck checkboxes for Apply to all holdings/items records
          BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(true);
          BulkEditActions.checkApplyToItemsRecordsCheckbox();
          BulkEditActions.clickApplyToHoldingsRecordsCheckbox();
          BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(false);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 6: Bulk edit MARC 110 field, remove subfield b with value 'Congress'
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('110', '1', '\\', 'b');
          BulkEditActions.findAndRemoveSubfieldActionForMarc('Congress');
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 7: Bulk edit MARC 336 field, replace subfield a value 'performed music' with 'text'
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('336', '\\', '\\', 'a', 1);
          BulkEditActions.findAndReplaceWithActionForMarc('performed music', 'text', 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 8: Bulk edit MARC 338 field, append subfield 3 with value 'liner notes'
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('338', '\\', '\\', 'a', 2);
          BulkEditActions.findAndAppendActionForMarc('online resource', '3', 'liner notes', 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 9: Confirm changes and verify preview
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            marcInstance.hrid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                value: 'true',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
                value: 'United States Joint Committee on the Library',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
                value: 'text',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATS,
                value: 'computer -- online resource',
              },
            ],
          );
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            marcInstanceWithHoldingAndItem.hrid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                value: 'true',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
                value: '',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
                value: '',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATS,
                value: '',
              },
            ],
          );

          // Step 10: Download preview in MARC format
          BulkEditActions.downloadPreviewInMarcFormat();

          // Step 10: Verify .mrc file content for all records to be changed
          const currentTimestampUpToMinutes = DateTools.getCurrentISO8601TimestampUpToMinutesUTC();
          const currentTimestampUpToMinutesOneMinuteAfter =
            DateTools.getCurrentISO8601TimestampUpToMinutesUTC(1);
          const assertionsOnMarcFileContent = [
            {
              uuid: marcInstance.uuid,
              assertions: [
                // 005 field is updated with date-time of file generation
                (record) => {
                  const value = record.get('005')[0].value;
                  expect(
                    value.startsWith(currentTimestampUpToMinutes) ||
                      value.startsWith(currentTimestampUpToMinutesOneMinuteAfter),
                  ).to.be.true;
                },
                // 110 1\ field edited
                (record) => {
                  expect(record.get('110')[0].ind1).to.eq('1');
                  expect(record.get('110')[0].ind2).to.eq(' ');
                  expect(record.get('110')[0].subf[0][0]).to.eq('a');
                  expect(record.get('110')[0].subf[0][1]).to.eq('United States.');
                  expect(record.get('110')[0].subf[1][0]).to.eq('b');
                  expect(record.get('110')[0].subf[1][1]).to.eq('Joint Committee on the Library.');
                },
                // 336 \\ field edited
                (record) => {
                  expect(record.get('336')[0].ind1).to.eq(' ');
                  expect(record.get('336')[0].ind2).to.eq(' ');
                  expect(record.get('336')[0].subf[0][0]).to.eq('a');
                  expect(record.get('336')[0].subf[0][1]).to.eq('text');
                  expect(record.get('336')[0].subf[1][0]).to.eq('2');
                  expect(record.get('336')[0].subf[1][1]).to.eq('rdacontent');
                },
                // 338 \\ field edited
                (record) => {
                  expect(record.get('338')[0].ind1).to.eq(' ');
                  expect(record.get('338')[0].ind2).to.eq(' ');
                  expect(record.get('338')[0].subf[0][0]).to.eq('a');
                  expect(record.get('338')[0].subf[0][1]).to.eq('online resource');
                  expect(record.get('338')[0].subf[1][0]).to.eq('b');
                  expect(record.get('338')[0].subf[1][1]).to.eq('cr');
                  expect(record.get('338')[0].subf[2][0]).to.eq('2');
                  expect(record.get('338')[0].subf[2][1]).to.eq('rdacarrier');
                  expect(record.get('338')[0].subf[3][0]).to.eq('3');
                  expect(record.get('338')[0].subf[3][1]).to.eq('liner notes');
                },
              ],
            },
          ];
          parseMrcFileContentAndVerify(
            fileNames.previewRecordsMarc,
            assertionsOnMarcFileContent,
            2,
          );

          // Step 11: Download preview in CSV format
          BulkEditActions.downloadPreview();
          // Step 11: Verify .csv file content for all records to be changed
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                value: 'true',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
                value: 'United States. Joint Committee on the Library.',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
                value: 'text',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATS,
                value: 'computer -- online resource',
              },
            ],
          );

          // Step 12: Commit changes and verify updated records
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
          BulkEditSearchPane.verifyErrorLabel(0, 2);
          BulkEditSearchPane.verifyShowWarningsCheckbox(false, false);

          // Step 13: Verify the table under "Errors & warnings" accordion
          BulkEditSearchPane.verifyErrorByIdentifier(
            marcInstanceWithHoldingAndItem.uuid,
            'No change in administrative data required',
            'Warning',
          );
          BulkEditSearchPane.verifyErrorByIdentifier(
            marcInstanceWithHoldingAndItem.uuid,
            'No change in MARC fields required',
            'Warning',
          );

          // Step 14: Download changed records (MARC)
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();
          // Step 14: Verify changed MARC file content for marcInstance
          parseMrcFileContentAndVerify(
            fileNames.changedRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 15: Download changed records (CSV)
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                value: 'true',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CONTRIBUTORS,
                value: 'United States. Joint Committee on the Library.',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TYPE,
                value: 'text',
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATS,
                value: 'computer -- online resource',
              },
            ],
          );

          // Step 16: Download errors (CSV) and verify warnings for marcInstanceWithHoldingAndItem
          BulkEditActions.downloadErrors();
          BulkEditFiles.verifyCSVFileRowsValueIncludes(fileNames.errorsFromCommitting, [
            `WARNING,${marcInstanceWithHoldingAndItem.uuid},No change in administrative data required`,
            `WARNING,${marcInstanceWithHoldingAndItem.uuid},No change in MARC fields required`,
          ]);

          // Step 17: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
          // InstanceRecordView.verifyContributors('United States. Joint Committee on the Library.');
          InstanceRecordView.verifyResourceType('text');
          // InstanceRecordView.verifyFormats('computer -- online resource');
          // InstanceRecordView.verifySuppressFromDiscovery(true);
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource(
            '110',
            '$aUnited States.$bJoint Committee on the Library.',
          );
          InventoryViewSource.verifyFieldInMARCBibSource('336', '$atext$2rdacontent');
          InventoryViewSource.verifyFieldInMARCBibSource(
            '338',
            '$aonline resource$bcr$2rdacarrier$3liner notes',
          );
          // (Optionally verify 005 field is updated)
        },
      );
    });
  });
});
