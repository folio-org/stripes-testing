import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import SelectBulkEditProfileModal from '../../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import FileManager from '../../../../support/utils/fileManager';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import {
  createBulkEditProfileBody,
  createAdminNoteRule,
  InstancesRules,
  createSuppressFromDiscoveryRule,
  ActionCreators,
  MarcRules,
  MarcActionCreators,
} from '../../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';
import Affiliations from '../../../../support/dictionary/affiliations';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';

const { createStaffSuppressRule } = InstancesRules;
const { createMarcFieldRule } = MarcRules;

// Profile factory functions
const createMainProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C788742_MarcInstancesProfile_${getRandomPostfix()}`,
    description: 'Test MARC instances bulk edit profile for 611, 583 fields in central tenant',
    entityType: 'INSTANCE_MARC',
    ruleDetails: [
      createAdminNoteRule(ActionCreators.findAndRemove('admin')),
      createStaffSuppressRule(true),
      createSuppressFromDiscoveryRule(true, true, true),
    ],
    marcRuleDetails: [
      createMarcFieldRule('611', '2', '0', 'd', [
        MarcActionCreators.find('1984'),
        MarcActionCreators.removeField(),
      ]),
      createMarcFieldRule('583', '\\', '\\', 'c', [
        MarcActionCreators.find('19770613'),
        MarcActionCreators.removeSubfield(),
      ]),
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
    title: `AT_C788742_MarcInstance_${getRandomPostfix()}`,
  },
  item: {
    barcode: `AT_C788742_${getRandomPostfix()}`,
  },
  permissions: [
    permissions.bulkEditEdit.gui,
    permissions.uiInventoryViewCreateEditInstances.gui,
    permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    permissions.enableStaffSuppressFacet.gui,
  ],
  profileIds: [],
  administrativeNote: 'admin note for testing',
  editedAdministrativeNote: ' note for testing',
  actionNote: 'transfer university archives',
  editedActionNote: 'transfer university archives',
  field611Data: '$aOlympic Games$n(23rd :$d1984 :$cLos Angeles, Calif.)$vPeriodicals.',
  field583Data: '$atransfer$c19770613$huniversity archives',
  editedField583Data: '$atransfer$huniversity archives',
  subjectHeading: 'Olympic Games (23rd : 1984 : Los Angeles, Calif.)--Periodicals',
};
const instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser(testData.permissions).then((userProperties) => {
          testData.user = userProperties;
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, testData.permissions);
          cy.resetTenant();
          cy.getAdminUserDetails().then((record) => {
            testData.adminSourceRecord = record;
          });

          // Create MARC instance with required fields for testing
          const marcInstanceFields = [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '245',
              content: `$a ${testData.marcInstance.title}`,
              indicators: ['1', '0'],
            },
            {
              tag: '583',
              content: testData.field583Data,
              indicators: ['\\', '\\'],
            },
            {
              tag: '611',
              content: testData.field611Data,
              indicators: ['2', '0'],
            },
          ];

          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            testData.marcInstance.uuid = instanceId;

            cy.getInstanceById(instanceId).then((marcInstance) => {
              testData.marcInstance.hrid = marcInstance.hrid;

              const updatedInstance = {
                ...marcInstance,
                administrativeNotes: [testData.administrativeNote],
                discoverySuppress: true,
                staffSuppress: false,
              };

              cy.updateInstance(updatedInstance);
            });

            // Create holding for the MARC instance
            cy.setTenant(Affiliations.College);

            cy.getLocations({ limit: 1 }).then((res) => {
              testData.locationId = res.id;
              testData.locationName = res.name;
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
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: testData.marcInstance.uuid,
                  permanentLocationId: testData.locationId,
                  sourceId: testData.sourceId,
                }).then((holdingRecord) => {
                  testData.holdingId = holdingRecord.id;

                  // Create item for the holding
                  cy.createItem({
                    holdingsRecordId: holdingRecord.id,
                    materialType: { id: testData.materialTypeId },
                    permanentLoanType: { id: testData.loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    barcode: testData.item.barcode,
                  }).then(({ body }) => {
                    testData.item.id = body.id;
                  });
                });
                // Create CSV file with instance UUID
                FileManager.createFile(
                  `cypress/fixtures/${instanceUUIDsFileName}`,
                  testData.marcInstance.uuid,
                );
                cy.resetTenant();
                // Create all bulk edit profiles using factory functions
                const mainProfile = createMainProfileBody();
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
                cy.login(testData.user.username, testData.user.password, {
                  path: TopMenu.bulkEditPath,
                  waiter: BulkEditSearchPane.waitLoading,
                });
                BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
                  'Instances',
                  'Instance UUIDs',
                );
                BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
                BulkEditSearchPane.waitFileUploading();
              });
          });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);

        testData.profileIds.forEach((id) => cy.deleteBulkEditProfile(id, true));

        cy.setTenant(Affiliations.College);
        cy.deleteItemViaApi(testData.item.id);
        cy.deleteHoldingRecordViaApi(testData.holdingId);
        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C788742 ECS | Executing bulk edit job using MARC Instances bulk edit profile in Central tenant (611, 583) (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C788742'] },
        () => {
          // Step 1: Click "Actions" menu
          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false, true);
          BulkEditActions.verifyStartBulkEditOptions();

          // Step 2: In the list of available column names uncheck checkboxes next to the options
          // that are going to be edited based on the bulk edit profile
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
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
          SelectBulkEditProfileModal.searchProfile('at_C788742');
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

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: testData.editedAdministrativeNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: 'true',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: 'false',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
              value: testData.editedActionNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
              value: '',
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
              value: testData.editedAdministrativeNote.trim(),
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: true,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: false,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUBJECT,
              value: '',
            },
            {
              header: 'Notes',
              value: `Action note;${testData.editedActionNote};false`,
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
                (record) => expect(record.get('611')).to.be.empty,
                (record) => {
                  const field583 = record.get('583')[0];

                  expect(field583.ind1).to.eq(' ');
                  expect(field583.ind2).to.eq(' ');
                  expect(field583.subf[0][0]).to.eq('a');
                  expect(field583.subf[0][1]).to.eq('transfer');
                  expect(field583.subf[1][0]).to.eq('h');
                  expect(field583.subf[1][1]).to.eq('university archives');
                  expect(field583.subf.length).to.eq(2);
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

          // Step 10: Click the "Actions" menu and Select "Download changed records (CSV)" element
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsFileName,
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

          // Step 12: Navigate to "Inventory" app, verify MARC instance
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.byKeywords(testData.marcInstance.title);
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceAdministrativeNote(
            testData.editedAdministrativeNote.trim(),
          );
          InstanceRecordView.verifyMarkAsStaffSuppressedWarning(true);
          InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery(false);
          InstanceRecordView.verifyInstanceNote(testData.editedActionNote);
          InstanceRecordView.openSubjectAccordion();
          InstanceRecordView.verifyInstanceSubjectAbsent();

          // Step 13: Click "Actions" menu, Select "View source" option, Verify that made changes
          // have been applied to MARC bibliographic record
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyAbsenceOfValue('611');
          InventoryViewSource.verifyFieldInMARCBibSource(
            '583',
            '\t583\t   \t$a transfer $h university archives',
          );
        },
      );
    });
  });
});
