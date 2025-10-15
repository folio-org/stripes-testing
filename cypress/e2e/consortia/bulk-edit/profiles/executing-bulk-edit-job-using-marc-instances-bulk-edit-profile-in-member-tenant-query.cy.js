import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
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
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import {
  createBulkEditProfileBody,
  createAdminNoteRule,
  InstancesRules,
  ActionCreators,
} from '../../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';
import { getLongDelay } from '../../../../support/utils/cypressTools';

const { createSetRecordsForDeletionRule } = InstancesRules;

// Profile factory function for Set deletion profile
const createDeletionProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C831962_MarcInstancesDeletionProfile_${getRandomPostfix()}`,
    description:
      'Test MARC instances bulk edit profile for setting records for deletion in member tenant',
    entityType: 'INSTANCE_MARC',
    ruleDetails: [
      createAdminNoteRule(ActionCreators.addToExisting('Record is set for deletion')),
      createSetRecordsForDeletionRule(true),
    ],
  });
};

const testData = {
  marcInstance: {
    title: `AT_C831962_MarcInstance_${getRandomPostfix()}`,
  },
  folioInstance: {
    title: `AT_C831962_FolioInstance_${getRandomPostfix()}`,
  },
  profileIds: [],
  adminNote: 'Record is set for deletion',
};
let queryFileNames;

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
          permissions.uiInventorySetRecordsForDeletion.gui,
          permissions.bulkEditQueryView.gui,
        ])
          .then((userProperties) => {
            testData.user = userProperties;

            cy.getAdminUserDetails().then((record) => {
              testData.adminSourceRecord = record;
            });
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              testData.instanceTypeId = instanceTypeData[0].id;
            });
            // Create MARC instance using simplified API
            cy.createSimpleMarcBibViaAPI(testData.marcInstance.title).then((instanceId) => {
              testData.marcInstance.uuid = instanceId;

              cy.getInstanceById(instanceId).then((marcInstance) => {
                testData.marcInstance.hrid = marcInstance.hrid;

                const updatedInstance = {
                  ...marcInstance,
                  discoverySuppress: false,
                  staffSuppress: false,
                  deleted: false,
                };

                cy.updateInstance(updatedInstance);
              });
            });
          })
          .then(() => {
            // Create FOLIO instance
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.folioInstance.title,
                discoverySuppress: false,
                staffSuppress: false,
                deleted: false,
              },
            }).then((instanceData) => {
              testData.folioInstance.uuid = instanceData.instanceId;

              cy.getInstanceById(testData.folioInstance.uuid).then((folioInstance) => {
                testData.folioInstance.hrid = folioInstance.hrid;
              });
            });
          })
          .then(() => {
            // Create bulk edit profile using factory function
            const deletionProfile = createDeletionProfileBody();
            testData.profileDescription = deletionProfile.description;

            cy.createBulkEditProfile(deletionProfile).then((profile) => {
              testData.profileIds.push(profile.id);
              testData.profileName = profile.name;
            });
          })
          .then(() => {
            // Build and execute query for local not set for deletion instances
            const instanceIds = [testData.marcInstance.uuid, testData.folioInstance.uuid].join(',');

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });

            BulkEditSearchPane.openQuerySearch();
            BulkEditSearchPane.checkInstanceRadio();
            BulkEditSearchPane.clickBuildQueryButton();
            QueryModal.verify();
            QueryModal.selectField(instanceFieldValues.flagForDeletion);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.selectValueFromSelect('False');
            QueryModal.addNewRow();
            QueryModal.selectField(instanceFieldValues.instanceId, 1);
            QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
            QueryModal.fillInValueTextfield(instanceIds, 1);
            cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
            QueryModal.clickTestQuery();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.clickRunQuery();
            QueryModal.verifyClosed();
            cy.wait('@getPreview', getLongDelay()).then((interception) => {
              const interceptedUuid = interception.request.url.match(
                /bulk-operations\/([a-f0-9-]+)\/preview/,
              )[1];
              testData.bulkEditJobId = interceptedUuid;
              queryFileNames = BulkEditFiles.getAllQueryDownloadedFileNames(
                testData.bulkEditJobId,
                true,
              );
              BulkEditSearchPane.verifySpecificTabHighlighted('Query');
              BulkEditSearchPane.verifyBulkEditQueryPaneExists();
              BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 instance');
            });
          });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        testData.profileIds.forEach((id) => cy.deleteBulkEditProfile(id, true));
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.marcInstance.uuid);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.folioInstance.uuid);
        BulkEditFiles.deleteAllDownloadedFiles(queryFileNames);
      });

      // Trillium
      it.skip(
        'C831962 ECS | Verify Set true for deletion of Instances via MARC flow using Bulk edit profile in Member tenant (Query) (consortia) (firebird)',
        { tags: [] },
        () => {
          // Step 1: Click "Actions" menu and uncheck columns that will be edited
          BulkEditActions.openActions();
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
          );

          // Step 2: Click "Actions" menu and select "Select instances with source MARC bulk edit profile"
          BulkEditActions.clickSelectBulkEditProfile('instances with source MARC');
          SelectBulkEditProfileModal.waitLoading('instances with source MARC');
          SelectBulkEditProfileModal.verifyAllModalElements();

          // Step 3: Click on the row with MARC Instances bulk edit profile from Preconditions
          SelectBulkEditProfileModal.selectProfile(testData.profileName);
          SelectBulkEditProfileModal.verifyModalClosed('instances with source MARC');

          // Verify "Are you sure?" form
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditActions.verifyMessageBannerInAreYouSureFormWhenSourceNotSupportedByMarc(1, 1);

          // Verify preview shows expected changes for MARC instance only
          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: testData.adminNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: 'true',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: 'true',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
              value: 'true',
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            testData.marcInstance.hrid,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

          // Step 4: Click the "Download preview in CSV format" button
          BulkEditActions.downloadPreview();

          const editedHeaderValuesInFile = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: testData.adminNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: true,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: true,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SET_FOR_DELETION,
              value: true,
            },
          ];

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            queryFileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.marcInstance.hrid,
            editedHeaderValuesInFile,
          );

          // Step 5: Click "Download preview in MARC format" button
          BulkEditActions.downloadPreviewInMarcFormat();

          const assertionsOnMarcFileContent = [
            {
              uuid: testData.marcInstance.uuid,
              assertions: [
                (record) => expect(record.leader[5]).to.equal('d'),
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
            queryFileNames.previewRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 6: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyError(
            testData.folioInstance.uuid,
            ERROR_MESSAGES.FOLIO_SOURCE_NOT_SUPPORTED_BY_MARC_BULK_EDIT,
          );
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            testData.marcInstance.hrid,
            editedHeaderValues,
          );

          // Step 7: Click "Actions" menu and select "Download changed records (CSV)"
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            queryFileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.marcInstance.hrid,
            editedHeaderValuesInFile,
          );

          // Step 8: Click "Actions" menu and select "Download changed records (MARC)"
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(
            queryFileNames.changedRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 9: Navigate to "Inventory" app and search for recently edited Instances
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.selectYesfilterStaffSuppress();
          InventorySearchAndFilter.byKeywords(testData.marcInstance.title);
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceAdministrativeNote(testData.adminNote);
          InstanceRecordView.verifyInstanceIsSetForDeletionSuppressedFromDiscoveryStaffSuppressedWarning();

          // Step 10: For edited MARC Instance, verify changes in source record
          InstanceRecordView.viewSource();
          InventoryViewSource.waitLoading();
          InventoryViewSource.checkFieldContentMatch('LDR', /^LEADER \d{5}d/);
          InventoryViewSource.verifyFieldInMARCBibSource(
            '245',
            `$a ${testData.marcInstance.title}`,
          );
          InventoryViewSource.close();

          InventorySearchAndFilter.byKeywords(testData.folioInstance.title);
          InventorySearchAndFilter.selectYesfilterStaffSuppress();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceAdministrativeNote('No value set\n-');
          InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery(false);
          InstanceRecordView.verifyMarkAsStaffSuppressedWarning(false);
          InstanceRecordView.verifyInstanceIsSetForDeletion(false);
        },
      );
    });
  });
});
