import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import SelectBulkEditProfileModal from '../../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import Affiliations from '../../../../support/dictionary/affiliations';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import {
  createBulkEditProfileBody,
  createAdminNoteRule,
  InstancesRules,
  createSuppressFromDiscoveryRule,
  ActionCreators,
} from '../../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';

const { createStaffSuppressRule, createStatisticalCodeRule } = InstancesRules;

// Profile factory functions
const createMainProfileBody = (statisticalCodeToAddId, statisticalCodeToRemoveId) => {
  return createBulkEditProfileBody({
    name: `AT_C788754_MarcInstancesProfile_${getRandomPostfix()}`,
    description: 'Test MARC instances bulk edit profile for administrative data in member tenant',
    entityType: 'INSTANCE_MARC',
    ruleDetails: [
      createAdminNoteRule(ActionCreators.removeAll()),
      createStatisticalCodeRule(ActionCreators.addToExisting(statisticalCodeToAddId)),
      createStatisticalCodeRule(ActionCreators.removeSome(statisticalCodeToRemoveId)),
      createStaffSuppressRule(false),
      createSuppressFromDiscoveryRule(false, false, false),
    ],
  });
};

const createSecondProfileBody = () => {
  return createBulkEditProfileBody({
    name: `Test_MarcInstancesProfile_${getRandomPostfix()}`,
    description: 'Test profile for testing search and sort functionality',
    entityType: 'INSTANCE_MARC',
    ruleDetails: [createAdminNoteRule(ActionCreators.findAndRemove('test'))],
  });
};

const createFolioInstanceProfileBody = () => {
  return createBulkEditProfileBody({
    name: `Test_FolioInstancesProfile_${getRandomPostfix()}`,
    description: 'Test FOLIO instances profile that should not appear in MARC instances list',
    entityType: 'INSTANCE',
    ruleDetails: [createAdminNoteRule(ActionCreators.findAndRemove('folio'))],
  });
};

const testData = {
  marcInstance: {
    title: `AT_C788754_MarcInstance_${getRandomPostfix()}`,
  },
  folioInstance: {
    title: `AT_C788754_FolioInstance_${getRandomPostfix()}`,
  },
  marcItem: {
    barcode: `AT_C788754_Marc_${getRandomPostfix()}`,
  },
  folioItem: {
    barcode: `AT_C788754_Folio_${getRandomPostfix()}`,
  },
  profileIds: [],
  administrativeNote: 'admin note for testing',
};
const instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          permissions.enableStaffSuppressFacet.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.getAdminUserDetails().then((record) => {
            testData.adminSourceRecord = record;
          });

          cy.getStatisticalCodes({ limit: 2 }).then((codes) => {
            cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
              const enrichedCodes = codes.map((code) => {
                const codeType = codeTypes.find((type) => type.id === code.statisticalCodeTypeId);
                return {
                  ...code,
                  typeName: codeType.name,
                  fullName: `${codeType.name}: ${code.code} - ${code.name}`,
                };
              });

              [testData.statisticalCodeToRemove, testData.statisticalCodeToAdd] = enrichedCodes;
            });
          });
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            testData.instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ limit: 1 }).then((res) => {
            testData.locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            testData.materialTypeId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              testData.sourceId = folioSource.id;
            })
            .then(() => {
              // Create MARC instance
              cy.createSimpleMarcBibViaAPI(testData.marcInstance.title).then((instanceId) => {
                testData.marcInstance.uuid = instanceId;

                cy.getInstanceById(instanceId).then((marcInstance) => {
                  testData.marcInstance.hrid = marcInstance.hrid;

                  const updatedInstance = {
                    ...marcInstance,
                    administrativeNotes: [testData.administrativeNote],
                    statisticalCodeIds: [testData.statisticalCodeToRemove.id],
                    discoverySuppress: false,
                    staffSuppress: true,
                  };
                  cy.updateInstance(updatedInstance);
                });

                // Create holding and item for the MARC instance
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: testData.marcInstance.uuid,
                  permanentLocationId: testData.locationId,
                  sourceId: testData.sourceId,
                }).then((holdingRecord) => {
                  testData.marcHoldingId = holdingRecord.id;

                  // Create item for the holding
                  cy.createItem({
                    holdingsRecordId: holdingRecord.id,
                    materialType: { id: testData.materialTypeId },
                    permanentLoanType: { id: testData.loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    barcode: testData.marcItem.barcode,
                  }).then(({ body }) => {
                    testData.marcItem.id = body.id;
                  });
                });
              });
            })
            .then(() => {
              // Create FOLIO instance with holdings and items
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.folioInstance.title,
                  administrativeNotes: [testData.administrativeNote],
                  statisticalCodeIds: [testData.statisticalCodeToRemove.id],
                  discoverySuppress: false,
                  staffSuppress: true,
                },
                holdings: [
                  {
                    permanentLocationId: testData.locationId,
                  },
                ],
                items: [
                  {
                    materialType: { id: testData.materialTypeId },
                    permanentLoanType: { id: testData.loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    barcode: testData.folioItem.barcode,
                  },
                ],
              }).then((instanceData) => {
                testData.folioInstance.uuid = instanceData.instanceId;
                testData.folioHoldingId = instanceData.holdingIds[0].id;
                testData.folioItem.id = instanceData.holdingIds[0].itemIds[0];

                cy.getInstanceById(testData.folioInstance.uuid).then((folioInstance) => {
                  testData.folioInstance.hrid = folioInstance.hrid;
                });
              });
            })
            .then(() => {
              // Create CSV file with both MARC and FOLIO instance UUIDs
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                `${testData.marcInstance.uuid}\n${testData.folioInstance.uuid}`,
              );

              // Create all bulk edit profiles using factory functions
              const mainProfile = createMainProfileBody(
                testData.statisticalCodeToAdd.id,
                testData.statisticalCodeToRemove.id,
              );
              const secondProfile = createSecondProfileBody();
              const folioProfile = createFolioInstanceProfileBody();

              // Store profile descriptions for test assertions
              testData.profileDescription = mainProfile.description;
              testData.secondProfileDescription = secondProfile.description;
              testData.folioInstanceProfileDescription = folioProfile.description;

              const profileConfigs = [
                { body: mainProfile, nameKey: 'profileName' },
                { body: secondProfile, nameKey: 'secondProfileName' },
                { body: folioProfile, nameKey: 'folioInstanceProfileName' },
              ];

              profileConfigs.forEach((config) => {
                cy.createBulkEditProfile(config.body).then((profile) => {
                  testData.profileIds.push(profile.id);
                  testData[config.nameKey] = profile.name;
                });
              });
            });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instances', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.user.userId);
        testData.profileIds.forEach((id) => cy.deleteBulkEditProfile(id, true));
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.marcInstance.uuid);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.folioInstance.uuid);
        FileManager.deleteFile(`cypress/downloads/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C788754 ECS | Executing bulk edit job using MARC Instances bulk edit profile in Member tenant (Logs) (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C788754'] },
        () => {
          // Step 1: Click "Actions" menu
          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false, true);
          BulkEditActions.verifyStartBulkEditOptions();

          // Step 2: In the list of available column names uncheck checkboxes next to the options
          // that are going to be edited based on the bulk edit profile
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          );

          // Step 3: Click "Select instances bulk edit profile"
          BulkEditActions.clickSelectBulkEditProfile('instances with source MARC');
          SelectBulkEditProfileModal.waitLoading('instances with source MARC');
          SelectBulkEditProfileModal.verifyAllModalElements();

          // Step 4-5: Verify the table with the list of existing instances bulk edit profiles
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileDescription,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfilesFoundText();
          SelectBulkEditProfileModal.verifyProfilesSortedByName();
          SelectBulkEditProfileModal.changeSortOrderByName();
          SelectBulkEditProfileModal.verifyProfilesSortedByName('descending');
          SelectBulkEditProfileModal.changeSortOrderByUpdatedDate();
          SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedDate();
          SelectBulkEditProfileModal.changeSortOrderByUpdatedBy();
          SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedBy();
          SelectBulkEditProfileModal.searchProfile('at_C788754');
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileDescription,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);
          SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.folioInstanceProfileName);
          SelectBulkEditProfileModal.searchProfile(testData.profileName);
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileDescription,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);
          SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.folioInstanceProfileName);

          // Step 6: Click on the row with MARC Instances bulk edit profile from Preconditions
          SelectBulkEditProfileModal.selectProfile(testData.profileName);
          SelectBulkEditProfileModal.verifyModalClosed('instances with source MARC');
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditActions.verifyMessageBannerInAreYouSureFormWhenSourceNotSupportedByMarc(1, 1);

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              value: testData.statisticalCodeToAdd.fullName,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: 'false',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: 'true',
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            testData.marcInstance.hrid,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

          // Step 7: Click the "Download preview in CSV format" button
          BulkEditActions.downloadPreview();

          const editedHeaderValuesInFile = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              value: testData.statisticalCodeToAdd.fullName,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: false,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: true,
            },
          ];

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.marcInstance.hrid,
            editedHeaderValuesInFile,
          );

          // Step 8: Click "Download preview in MARC format" button
          BulkEditActions.downloadPreviewInMarcFormat();

          const assertionsOnMarcFileContent = [
            {
              uuid: testData.marcInstance.uuid,
              assertions: [
                (record) => {
                  const field245 = record.get('245')[0];

                  expect(field245.ind1).to.eq(' ');
                  expect(field245.ind2).to.eq(' ');
                  expect(field245.subf[0][0]).to.eq('a');
                  expect(field245.subf[0][1]).to.eq(testData.marcInstance.title);
                },
                (record) => {
                  const field999 = record.get('999')[0];

                  expect(field999.subf[0][0]).to.eq('i');
                  expect(field999.subf[0][1]).to.eq(testData.marcInstance.uuid);
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            fileNames.previewRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 9: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            testData.marcInstance.hrid,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyError(
            testData.folioInstance.uuid,
            ERROR_MESSAGES.FOLIO_SOURCE_NOT_SUPPORTED_BY_MARC_BULK_EDIT,
          );

          // Step 10: Click the "Actions" menu and Select "Download changed records (CSV)" element
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.marcInstance.hrid,
            editedHeaderValuesInFile,
          );

          // Step 11: Click "Actions" menu and Select "Download changed records (MARC)" option
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(
            fileNames.changedRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // remove earlier downloaded files
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);
          FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);

          // Step 12: Click "Logs" toggle in "Set criteria" pane
          // Check "Inventory - instances" checkbox under "Record types" accordion
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkInstancesCheckbox();

          // Step 13: Click on the "..." action element in the row with recently completed bulk edit job
          BulkEditLogs.clickActionsRunBy(testData.user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompleted(true);

          // Step 14: Click on the "File that was used to trigger the bulk edit"
          BulkEditLogs.downloadFileUsedToTrigger();
          ExportFile.verifyFileIncludes(instanceUUIDsFileName, [
            testData.marcInstance.uuid,
            testData.folioInstance.uuid,
          ]);

          // Step 15: Click on the "File with the matching records" hyperlink
          BulkEditLogs.downloadFileWithMatchingRecords();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.marcInstance.hrid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                value: testData.administrativeNote,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
                value: testData.statisticalCodeToRemove.fullName,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
                value: true,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
                value: false,
              },
            ],
          );

          // Step 16: Click on the "File with the preview of proposed changes (CSV)" hyperlink
          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.marcInstance.hrid,
            editedHeaderValuesInFile,
          );

          // Step 17: Click on the "File with the preview of proposed changes (MARC)" hyperlink
          BulkEditLogs.downloadFileWithProposedChangesMarc();
          parseMrcFileContentAndVerify(
            fileNames.previewRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 18: Click on the "File with updated records (CSV)" hyperlink
          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.marcInstance.hrid,
            editedHeaderValuesInFile,
          );

          // Step 19: Click on the "File with updated records (MARC)" hyperlink
          BulkEditLogs.downloadFileWithUpdatedRecordsMarc();
          parseMrcFileContentAndVerify(
            fileNames.changedRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 20: Navigate to "Inventory" app, Search for the recently edited MARC Instances
          // Verify that made changes have been applied
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.byKeywords(testData.marcInstance.title);
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyAdministrativeNote('No value set-');
          InstanceRecordView.verifyMarkAsStaffSuppressedWarning(false);
          InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery(true);

          // Step 21: Click "Actions" menu, Select "View source" option, Verify that made changes
          // have been applied to MARC bibliographic record
          InstanceRecordView.viewSource();
          InventoryViewSource.waitLoading();
          InventoryViewSource.verifyFieldInMARCBibSource(
            '245',
            `$a ${testData.marcInstance.title}`,
          );
          InventoryViewSource.close();

          // Step 22: Verify FOLIO instance unchanged (since profile only affects MARC instances)
          InventorySearchAndFilter.byKeywords(testData.folioInstance.title);
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceAdministrativeNote(testData.administrativeNote);
          InstanceRecordView.verifyStatisticalCodeTypeAndName(
            testData.statisticalCodeToRemove.typeName,
            testData.statisticalCodeToRemove.name,
          );
          InstanceRecordView.verifyMarkAsStaffSuppressedWarning(true);
          InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery(false);
        },
      );
    });
  });
});
