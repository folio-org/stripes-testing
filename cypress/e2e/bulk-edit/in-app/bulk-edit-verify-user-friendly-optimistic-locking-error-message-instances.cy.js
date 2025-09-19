import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

let user;
let instanceTypeId;
const testInstances = [
  {
    type: 'FOLIO',
    title: `AT_C468221_FolioInstance_${getRandomPostfix()}`,
    instanceId: null,
    willBeEditedInInventory: true,
  },
  {
    type: 'MARC',
    title: `AT_C468221_MarcInstance_${getRandomPostfix()}`,
    instanceId: null,
    willBeEditedInInventory: true,
  },
  {
    type: 'FOLIO',
    title: `AT_C468221_FolioInstanceSuccess_${getRandomPostfix()}`,
    instanceId: null,
    willBeEditedInInventory: false,
  },
  {
    type: 'MARC',
    title: `AT_C468221_MarcInstanceSuccess_${getRandomPostfix()}`,
    instanceId: null,
    willBeEditedInInventory: false,
  },
];
const createMarcFields = (title) => [
  {
    tag: '008',
    content: {
      Type: '\\',
      BLvl: '\\',
      DtSt: '\\',
      Date1: '\\\\\\\\',
      Date2: '\\\\\\\\',
      Ctry: '\\\\\\',
      Lang: 'eng',
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
    content: `$a ${title}`,
    indicators: ['1', '0'],
  },
];
const instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
const newAdministrativeNote = 'NEW: administrative note';
const marcAdministrativeNote = 'administrative note for MARC';
const folioAdministrativeNote = 'administrative note for FOLIO';
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          })
          .then(() => {
            testInstances.forEach((instance) => {
              if (instance.type === 'FOLIO') {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instance.title,
                  },
                }).then((createdInstanceData) => {
                  instance.instanceId = createdInstanceData.instanceId;
                });
              } else if (instance.type === 'MARC') {
                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  createMarcFields(instance.title),
                ).then((instanceId) => {
                  instance.instanceId = instanceId;
                });
              }
            });
          })
          .then(() => {
            const instanceUUIDs = testInstances.map((instance) => instance.instanceId).join('\n');

            FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, instanceUUIDs);

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      testInstances.forEach((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.instanceId);
      });

      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C468221 Verify user-friendly error message for optimistic locking - instances (firebird)',
      { tags: ['criticalPath', 'firebird', 'C468221'] },
      () => {
        const allInstanceIds = testInstances.map((instance) => instance.instanceId);
        const optimisticLockingErrorInstances = testInstances.filter(
          (instance) => instance.willBeEditedInInventory,
        );
        const successfulUpdateInstances = testInstances.filter(
          (instance) => !instance.willBeEditedInInventory,
        );

        // Step 1: Select "Inventory - instances" radio button and "Instance UUIDs" option
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

        // Step 2: Upload .csv file with valid Instances UUIDs
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Check the result of uploading the .csv file with Instances UUIDs
        BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('4 instance');
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

        // Step 4: Check checkbox next to "Source" and "Instance UUID"
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
        );
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
        );

        // Step 5-9: Edit instances in inventory to cause optimistic locking errors
        optimisticLockingErrorInstances.forEach((instance) => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

          InventorySearchAndFilter.waitLoading();

          // Search for instance by ID and select it
          InventorySearchAndFilter.searchInstanceByTitle(instance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstancePaneExists();

          // Edit instance - add administrative note
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          const administrativeNote =
            instance.type === 'MARC' ? marcAdministrativeNote : folioAdministrativeNote;
          InstanceRecordEdit.addAdministrativeNote(administrativeNote);
          InstanceRecordEdit.saveAndClose();
          InstanceRecordView.verifyInstancePaneExists();
          InventorySearchAndFilter.resetAll();
        });

        // Step 10: Continue with bulk edit process
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.verifyPaneRecordsCount('4 instance');

        // Step 11: Download matched records (CSV)
        BulkEditActions.downloadMatchedResults();

        allInstanceIds.forEach((instanceId) => {
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            instanceId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            instanceId,
          );
        });

        // Step 12: Start bulk edit - select "FOLIO Instances"
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyCancelButtonDisabled(false);
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 13-16: Select "Administrative note" option from "Select option" dropdown
        BulkEditActions.addItemNote('Administrative note', newAdministrativeNote);
        BulkEditActions.verifyTheActionOptions([
          'Add note',
          'Change note type',
          'Find',
          'Remove all',
        ]);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 17: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(4);
        BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

        // Verify Preview of records to be changed shows administrative note changes
        allInstanceIds.forEach((instanceId) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            instanceId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            newAdministrativeNote,
          );
        });

        // Step 18: Download preview in CSV format
        BulkEditActions.downloadPreview();

        allInstanceIds.forEach((instanceId) => {
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            instanceId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            newAdministrativeNote,
          );
        });

        // Step 19: Click "Commit changes" button
        // Verify 2 instances were successfully updated and 2 had optimistic locking errors
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(2);
        BulkEditSearchPane.verifyErrorLabel(2);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);

        successfulUpdateInstances.forEach((instance) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            instance.instanceId,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            newAdministrativeNote,
          );
        });

        // Step 20: Check the noted UUIDs in table populated with Top 10 Errors
        const optimisticLockingErrorMessage =
          'The record cannot be saved because it is not the most recent version. Stored version is 2, bulk edit version is 1. View latest version';

        optimisticLockingErrorInstances.forEach((instance) => {
          BulkEditSearchPane.verifyNonMatchedResults(
            instance.instanceId,
            optimisticLockingErrorMessage,
          );
        });

        // Step 21: Click on "View latest version" active text
        cy.url().then((bulkEditUrl) => {
          optimisticLockingErrorInstances.forEach((instance) => {
            BulkEditSearchPane.clickViewLatestVersionInErrorsAccordionByIdentifier(
              instance.instanceId,
            );
            InventorySearchAndFilter.waitLoading();
            InstanceRecordView.verifyInstancePaneExists();

            const administrativeNote =
              instance.type === 'MARC' ? marcAdministrativeNote : folioAdministrativeNote;
            InstanceRecordView.verifyAdministrativeNote(administrativeNote);

            // Return to Bulk edit page
            cy.visit(bulkEditUrl);
          });

          BulkEditSearchPane.verifyErrorLabel(2);
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(2);

          // Step 22: Download changed records (CSV)
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          successfulUpdateInstances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.changedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instance.instanceId,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              newAdministrativeNote,
            );
          });

          // Step 23: Download errors (CSV)
          BulkEditActions.downloadErrors();

          // Step 24: Check the noted UUIDs in .csv file with errors
          optimisticLockingErrorInstances.forEach((instance) => {
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
              `ERROR,${instance.instanceId},The record cannot be saved because it is not the most recent version. Stored version is 2, bulk edit version is 1. /inventory/view/${instance.instanceId}`,
            ]);
          });

          // Step 25: Navigate to Inventory and verify changes
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();

          // Verify instances with optimistic locking errors retain their original administrative notes
          optimisticLockingErrorInstances.forEach((instance) => {
            InventorySearchAndFilter.searchInstanceByTitle(instance.instanceId);
            InventoryInstances.selectInstance();
            InstanceRecordView.verifyInstancePaneExists();
            const administrativeNote =
              instance.type === 'MARC' ? marcAdministrativeNote : folioAdministrativeNote;
            InstanceRecordView.verifyAdministrativeNote(administrativeNote);
            InstanceRecordView.verifyAdministrativeNote(newAdministrativeNote, false);
            InventorySearchAndFilter.resetAll();
          });

          // Verify instances without version conflicts were successfully updated
          successfulUpdateInstances.forEach((instance) => {
            InventorySearchAndFilter.searchInstanceByTitle(instance.instanceId);
            InventoryInstances.selectInstance();
            InstanceRecordView.verifyInstancePaneExists();
            InstanceRecordView.verifyAdministrativeNote(newAdministrativeNote);
            InventorySearchAndFilter.resetAll();
          });
        });
      },
    );
  });
});
