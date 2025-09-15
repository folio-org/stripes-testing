import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  BULK_EDIT_FORMS,
} from '../../../support/constants';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const electronicAccessTableHeadersInFile =
  'URL relationship;URI;Link text;Materials specified;URL public note\n';
const folioInstanceWithoutElectronicAccess = {
  title: `AT_C736694_FolioInstance_NoElectronicAccess_${getRandomPostfix()}`,
};
const folioInstanceWithElectronicAccess = {
  title: `AT_C736694_FolioInstance_WithElectronicAccess_${getRandomPostfix()}`,
  electronicAccess: {
    uri: 'http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=e000xna&AN=281338',
    linkText: 'eBooks on EBSCOhost',
    materialsSpecification: 'Table of contents only',
    publicNote:
      'FTP access to PostScript version includes groups of article files with .pdf extension',
    relationshipId: null,
  },
};
const marcInstanceWithElectronicAccess = {
  title: `AT_C736694_MarcInstance_WithElectronicAccess_${getRandomPostfix()}`,
  electronicAccess: [
    {
      uri: 'http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=e000xna&AN=281338',
      linkText: '',
      materialsSpecification: '',
      publicNote: '',
      relationship: 'Resource', // 2nd indicator 0
    },
    {
      uri: 'http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=e000xna&AN=281338',
      linkText: 'eBooks on EBSCOhost',
      materialsSpecification: '',
      publicNote: '',
      relationship: 'Version of resource', // 2nd indicator 1
    },
    {
      uri: 'http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=e000xna&AN=281338',
      linkText: 'eBooks on EBSCOhost',
      materialsSpecification: 'Table of contents only',
      publicNote:
        'FTP access to PostScript version includes groups of article files with .pdf extension',
      relationship: 'Related resource', // 2nd indicator 2
    },
    {
      uri: 'http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=e000xna&AN=281338',
      linkText: 'eBooks on EBSCOhost',
      materialsSpecification: 'Table of contents only',
      publicNote:
        'FTP access to PostScript version includes groups of article files with .pdf extension',
      relationship: 'No information provided', // 2nd indicator blank
    },
  ],
};
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstanceWithElectronicAccess.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '856',
    content: `$u ${marcInstanceWithElectronicAccess.electronicAccess[0].uri}`,
    indicators: ['4', '0'],
  },
  {
    tag: '856',
    content: `$u ${marcInstanceWithElectronicAccess.electronicAccess[1].uri} $y ${marcInstanceWithElectronicAccess.electronicAccess[1].linkText}`,
    indicators: ['4', '1'],
  },
  {
    tag: '856',
    content: `$z ${marcInstanceWithElectronicAccess.electronicAccess[2].publicNote} $u ${marcInstanceWithElectronicAccess.electronicAccess[2].uri} $3 ${marcInstanceWithElectronicAccess.electronicAccess[2].materialsSpecification} $y ${marcInstanceWithElectronicAccess.electronicAccess[2].linkText}`,
    indicators: ['4', '2'],
  },
  {
    tag: '856',
    content: `$3 ${marcInstanceWithElectronicAccess.electronicAccess[3].materialsSpecification} $u ${marcInstanceWithElectronicAccess.electronicAccess[3].uri} $y ${marcInstanceWithElectronicAccess.electronicAccess[3].linkText} $z ${marcInstanceWithElectronicAccess.electronicAccess[3].publicNote}`,
    indicators: ['4', ' '],
  },
];

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C736694');

      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.bulkEditLogsView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Get URL relationships for electronic access
        UrlRelationship.getViaApi({
          query: `name=="${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE}"`,
        }).then((relationships) => {
          folioInstanceWithElectronicAccess.electronicAccess.relationshipId = relationships[0].id;

          // Get instance types once for both FOLIO instances
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            const instanceTypeId = instanceTypeData[0].id;

            // Create FOLIO instance without electronic access
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: folioInstanceWithoutElectronicAccess.title,
              },
            }).then((createdInstanceData) => {
              folioInstanceWithoutElectronicAccess.instanceId = createdInstanceData.instanceId;

              // Get HRID for instance without electronic access
              cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
                folioInstanceWithoutElectronicAccess.instanceHrid = instance.hrid;
              });
            });

            // Create FOLIO instance with electronic access
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: folioInstanceWithElectronicAccess.title,
                electronicAccess: [folioInstanceWithElectronicAccess.electronicAccess],
              },
            }).then((createdInstanceData) => {
              folioInstanceWithElectronicAccess.instanceId = createdInstanceData.instanceId;

              // Get HRID for instance with electronic access
              cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
                folioInstanceWithElectronicAccess.instanceHrid = instance.hrid;
              });
            });

            // Create MARC instance with multiple electronic access entries
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              marcInstanceFields,
            ).then((instanceId) => {
              marcInstanceWithElectronicAccess.instanceId = instanceId;

              // Get HRID for MARC instance
              cy.getInstanceById(instanceId).then((instance) => {
                marcInstanceWithElectronicAccess.instanceHrid = instance.hrid;
              });

              // Create CSV file with instance UUIDs
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                `${folioInstanceWithoutElectronicAccess.instanceId}\n${folioInstanceWithElectronicAccess.instanceId}\n${marcInstanceWithElectronicAccess.instanceId}`,
              );
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(folioInstanceWithoutElectronicAccess.instanceId);
      InventoryInstance.deleteInstanceViaApi(folioInstanceWithElectronicAccess.instanceId);
      InventoryInstance.deleteInstanceViaApi(marcInstanceWithElectronicAccess.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C736694 Verify rendering "Electronic access" data of Instance record in bulk edit forms and files (firebird)',
      { tags: ['extendedPath', 'firebird', 'C736694'] },
      () => {
        // Step 1: Select record type and identifier
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

        // Step 2: Upload CSV file
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Check upload result
        BulkEditSearchPane.verifyPaneRecordsCount('3 instance');
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          false,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
        );

        // Step 4: Show Electronic access column
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
        );

        // Step 5: Verify Electronic access display in preview table
        // For Instance without populated "Electronic access" data column is not populated
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          folioInstanceWithoutElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          '',
        );

        // For FOLIO Instance with "Electronic access" data column is populated with electronic access table
        BulkEditSearchPane.verifyElectronicAccessTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
          folioInstanceWithElectronicAccess.instanceHrid,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          folioInstanceWithElectronicAccess.electronicAccess.uri,
          folioInstanceWithElectronicAccess.electronicAccess.linkText,
          folioInstanceWithElectronicAccess.electronicAccess.materialsSpecification,
          folioInstanceWithElectronicAccess.electronicAccess.publicNote,
        );

        // For MARC Instance with multiple "Electronic access" entries
        marcInstanceWithElectronicAccess.electronicAccess.forEach((access) => {
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
            marcInstanceWithElectronicAccess.instanceHrid,
            access.relationship,
            access.uri,
            access.linkText || '-',
            access.materialsSpecification || '-',
            access.publicNote || '-',
          );
        });

        // Step 6: Download matched records and verify CSV content
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        const folioElectronicAccessInFile = `${electronicAccessTableHeadersInFile}${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};${folioInstanceWithElectronicAccess.electronicAccess.uri};${folioInstanceWithElectronicAccess.electronicAccess.linkText};${folioInstanceWithElectronicAccess.electronicAccess.materialsSpecification};${folioInstanceWithElectronicAccess.electronicAccess.publicNote}`;

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          folioElectronicAccessInFile,
        );

        // Verify instance without electronic access has empty electronic access column
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          '',
        );

        // Verify MARC instance with multiple electronic access entries
        const marcElectronicAccessInFile = `${electronicAccessTableHeadersInFile}${marcInstanceWithElectronicAccess.electronicAccess.map((access) => `${access.relationship};${access.uri};${access.linkText || '-'};${access.materialsSpecification || '-'};${access.publicNote || '-'}`).join('|')}`;

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          marcElectronicAccessInFile,
        );

        // Step 7: Start bulk edit process
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();

        // Select any option and action to edit Instance record
        BulkEditActions.selectOption('Suppress from discovery');
        BulkEditActions.selectAction('Set true');
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();

        // Step 8: Verify Electronic access in preview of changes
        BulkEditActions.verifyMessageBannerInAreYouSureForm(3);

        // For Instance without populated "Electronic access" data column is not populated in "Are you sure" form
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          folioInstanceWithoutElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          '',
        );

        // For FOLIO Instance - verify Electronic access data is rendered consistently in "Preview of records to be changed"
        BulkEditSearchPane.verifyElectronicAccessTableInForm(
          BULK_EDIT_FORMS.ARE_YOU_SURE,
          folioInstanceWithElectronicAccess.instanceHrid,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          folioInstanceWithElectronicAccess.electronicAccess.uri,
          folioInstanceWithElectronicAccess.electronicAccess.linkText,
          folioInstanceWithElectronicAccess.electronicAccess.materialsSpecification,
          folioInstanceWithElectronicAccess.electronicAccess.publicNote,
        );

        // For MARC Instance with multiple "Electronic access" entries in "Are you sure" form
        marcInstanceWithElectronicAccess.electronicAccess.forEach((access) => {
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.ARE_YOU_SURE,
            marcInstanceWithElectronicAccess.instanceHrid,
            access.relationship,
            access.uri,
            access.linkText || '-',
            access.materialsSpecification || '-',
            access.publicNote || '-',
          );
        });

        // Also verify suppress from discovery change
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          folioInstanceWithElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'true',
        );

        // Step 9: Download preview changes
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          folioElectronicAccessInFile,
        );

        // Verify instance without electronic access has empty electronic access column
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          '',
        );

        // Verify MARC instance with multiple electronic access entries
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          marcElectronicAccessInFile,
        );

        // Step 10: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(3);

        // Step 11: Verify Electronic access in changed records
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          folioInstanceWithoutElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          '',
        );

        // For FOLIO Instance - verify Electronic access data is rendered consistently in "Preview of records changed" form
        BulkEditSearchPane.verifyElectronicAccessTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
          folioInstanceWithElectronicAccess.instanceHrid,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          folioInstanceWithElectronicAccess.electronicAccess.uri,
          folioInstanceWithElectronicAccess.electronicAccess.linkText,
          folioInstanceWithElectronicAccess.electronicAccess.materialsSpecification,
          folioInstanceWithElectronicAccess.electronicAccess.publicNote,
        );

        // For MARC Instance with multiple "Electronic access" entries in "Preview of records changed" form
        marcInstanceWithElectronicAccess.electronicAccess.forEach((access, index) => {
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
            marcInstanceWithElectronicAccess.instanceHrid,
            access.relationship,
            access.uri,
            access.linkText || '-',
            access.materialsSpecification || '-',
            access.publicNote || '-',
            index,
          );
        });

        // Also verify suppress from discovery change in changed records accordion
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          folioInstanceWithElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'true',
        );

        // Step 12: Download changed records
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          folioElectronicAccessInFile,
        );

        // Verify instance without electronic access has empty electronic access column
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          '',
        );

        // Verify MARC instance with multiple electronic access entries
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          marcElectronicAccessInFile,
        );

        // remove earlier downloaded files
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);

        // Steps 13-14: Verify logs and downloadable files
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.clickActionsRunBy(user.username);
        BulkEditLogs.verifyLogsRowActionWhenCompleted();

        // Step 15: Click on the "File with the matching records" hyperlink, Check display of "Electronic access" Instance data
        BulkEditLogs.downloadFileWithMatchingRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          folioElectronicAccessInFile,
        );

        // Verify instance without electronic access has empty electronic access column
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          '',
        );

        // Verify MARC instance with multiple electronic access entries
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          marcElectronicAccessInFile,
        );

        // Step 16: Click on the "File with the preview of proposed changes (CSV)" hyperlink, Check display of "Electronic access" Instance data
        BulkEditLogs.downloadFileWithProposedChanges();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          folioElectronicAccessInFile,
        );

        // Verify instance without electronic access has empty electronic access column
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          '',
        );

        // Verify MARC instance with multiple electronic access entries
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          marcElectronicAccessInFile,
        );

        // Step 17: Click on the "File with updated records (CSV)" hyperlink, Check display of "Electronic access" Instance data
        BulkEditLogs.downloadFileWithUpdatedRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          folioElectronicAccessInFile,
        );

        // Verify instance without electronic access has empty electronic access column
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          '',
        );

        // Verify MARC instance with multiple electronic access entries
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithElectronicAccess.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ELECTRONIC_ACCESS,
          marcElectronicAccessInFile,
        );
      },
    );
  });
});
