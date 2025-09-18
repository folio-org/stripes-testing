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
import { BULK_EDIT_TABLE_COLUMN_HEADERS, BULK_EDIT_FORMS } from '../../../support/constants';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const publicationTableHeadersInFile =
  'Publisher;Publisher role;Place of publication;Publication date\n';
const folioInstanceWithoutPublication = {
  title: `AT_C773207_FolioInstance_NoPublication_${getRandomPostfix()}`,
};
const folioInstanceWithPublication = {
  title: `AT_C773207_FolioInstance_WithPublication_${getRandomPostfix()}`,
  publication: [
    {
      publisher: 'Test Publisher',
      role: 'Production',
      place: 'Test Place',
      dateOfPublication: '2023',
    },
  ],
};
const marcInstanceWithPublication = {
  title: `AT_C773207_MarcInstance_WithPublication_${getRandomPostfix()}`,
  publications: [
    {
      publisher: '[s.n.]',
      role: '-',
      place: 'Victoria, B.C.',
      dateOfPublication: '1898-1945',
    },
    {
      publisher: 'Gauthier-Villars ; University of Chicago Press',
      role: '-',
      place: 'Paris ; Chicago',
      dateOfPublication: '1955',
    },
    {
      publisher: 'Vogue',
      role: '-',
      place: 'London',
      dateOfPublication: '-',
    },
    {
      publisher: 'National Agriculture Library ; For sale by the Supt. of Docs., U.S. G.P.O.',
      role: '-',
      place: 'Washington, D.C.',
      dateOfPublication: '-',
    },
    {
      publisher: '[publisher not identified]',
      role: 'Production',
      place: 'Boston',
      dateOfPublication: '2010',
    },
    {
      publisher: '-',
      role: 'Production',
      place: '-',
      dateOfPublication: 'copyright 2005',
    },
    {
      publisher: '[publisher not identified]',
      role: 'Publication',
      place: 'Boston',
      dateOfPublication: '2010',
    },
    {
      publisher: 'Iverson Company',
      role: 'Publication',
      place: 'Seattle',
      dateOfPublication: '-',
    },
    {
      publisher: '[publisher not identified]',
      role: 'Publication',
      place: 'Washington',
      dateOfPublication: '1960',
    },
    {
      publisher: 'ABC Publishers',
      role: 'Publication',
      place: '-',
      dateOfPublication: '2009',
    },
    {
      publisher: 'Iverson Company',
      role: 'Distribution',
      place: 'Seattle',
      dateOfPublication: '©2002',
    },
    {
      publisher: 'Kinsey Printing Company',
      role: 'Manufacture',
      place: 'Cambridge',
      dateOfPublication: 'Ⓟ1983',
    },
    {
      publisher: '-',
      role: '-',
      place: 'Washington, D.C.',
      dateOfPublication: 'copyright 2005',
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
    content: `$a ${marcInstanceWithPublication.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '260',
    content: '$aVictoria, B.C. :$b[s.n.],$c1898-1945.',
    indicators: ['\\', '\\'],
  },
  {
    tag: '260',
    content: '$aParis :$bGauthier-Villars ;$aChicago :$bUniversity of Chicago Press,$c1955.',
    indicators: ['\\', '\\'],
  },
  {
    tag: '260',
    content: '$31980-May 1993$aLondon :$bVogue',
    indicators: ['2', '\\'],
  },
  {
    tag: '260',
    content:
      '$31998-$aWashington, D.C. :$bNational Agriculture Library :$bFor sale by the Supt. of Docs., U.S. G.P.O.',
    indicators: ['3', '\\'],
  },
  {
    tag: '264',
    content: '$aBoston :$b[publisher not identified],$c2010.',
    indicators: ['2', '0'],
  },
  {
    tag: '264',
    content: '$ccopyright 2005',
    indicators: ['\\', '0'],
  },
  {
    tag: '264',
    content: '$aBoston :$b[publisher not identified],$c2010.',
    indicators: ['3', '1'],
  },
  {
    tag: '264',
    content: '$aSeattle :$bIverson Company',
    indicators: ['\\', '1'],
  },
  {
    tag: '264',
    content: '$aWashington :$b[publisher not identified],$c1960.',
    indicators: ['\\', '1'],
  },
  {
    tag: '264',
    content: '$bABC Publishers,$c2009.',
    indicators: ['\\', '1'],
  },
  {
    tag: '264',
    content: '$aSeattle :$bIverson Company$c©2002',
    indicators: ['\\', '2'],
  },
  {
    tag: '264',
    content: '$aCambridge :$bKinsey Printing Company$cⓅ1983',
    indicators: ['\\', '3'],
  },
  {
    tag: '264',
    content: '$aWashington, D.C.$ccopyright 2005',
    indicators: ['\\', '4'],
  },
];

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C773207');

      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.bulkEditLogsView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Get instance types for all instances
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          const instanceTypeId = instanceTypeData[0].id;

          // Create FOLIO instance without publication
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: folioInstanceWithoutPublication.title,
            },
          }).then((createdInstanceData) => {
            folioInstanceWithoutPublication.instanceId = createdInstanceData.instanceId;

            // Get HRID for instance without publication
            cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
              folioInstanceWithoutPublication.instanceHrid = instance.hrid;
            });
          });

          // Create FOLIO instance with publication
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: folioInstanceWithPublication.title,
              publication: folioInstanceWithPublication.publication,
            },
          }).then((createdInstanceData) => {
            folioInstanceWithPublication.instanceId = createdInstanceData.instanceId;

            // Get HRID for instance with publication
            cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
              folioInstanceWithPublication.instanceHrid = instance.hrid;
            });
          });

          // Create MARC instance with multiple publication entries
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            marcInstanceWithPublication.instanceId = instanceId;

            // Get HRID for MARC instance
            cy.getInstanceById(instanceId).then((instance) => {
              marcInstanceWithPublication.instanceHrid = instance.hrid;
            });

            // Create CSV file with instance UUIDs
            FileManager.createFile(
              `cypress/fixtures/${instanceUUIDsFileName}`,
              `${folioInstanceWithoutPublication.instanceId}\n${folioInstanceWithPublication.instanceId}\n${marcInstanceWithPublication.instanceId}`,
            );
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

      [
        folioInstanceWithoutPublication.instanceId,
        folioInstanceWithPublication.instanceId,
        marcInstanceWithPublication.instanceId,
      ].forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    // Trillium
    it.skip(
      'C773207 Verify rendering "Publication" data of Instance record in bulk edit forms and files (firebird)',
      { tags: [] },
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
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
        );

        // Step 4: Show Publication column
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
        );

        // Step 5: Verify Publication display in preview table
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          folioInstanceWithoutPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          '',
        );
        BulkEditSearchPane.verifyPublicationTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
          folioInstanceWithPublication.instanceHrid,
          folioInstanceWithPublication.publication[0].publisher,
          folioInstanceWithPublication.publication[0].role,
          folioInstanceWithPublication.publication[0].place,
          folioInstanceWithPublication.publication[0].dateOfPublication,
        );

        marcInstanceWithPublication.publications.forEach((publication) => {
          BulkEditSearchPane.verifyPublicationTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
            marcInstanceWithPublication.instanceHrid,
            publication.publisher,
            publication.role,
            publication.place,
            publication.dateOfPublication,
          );
        });

        // Step 6: Download matched records and verify CSV content
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        const folioPublicationInFile = `${publicationTableHeadersInFile}${folioInstanceWithPublication.publication[0].publisher};${folioInstanceWithPublication.publication[0].role};${folioInstanceWithPublication.publication[0].place};${folioInstanceWithPublication.publication[0].dateOfPublication}`;

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          folioPublicationInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          '',
        );

        const marcPublicationInFile = `${publicationTableHeadersInFile}${marcInstanceWithPublication.publications.map((publication) => `${publication.publisher};${publication.role};${publication.place};${publication.dateOfPublication}`).join('|')}`;

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          marcPublicationInFile,
        );

        // Step 7: Start bulk edit process
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.selectOption('Suppress from discovery');
        BulkEditActions.selectAction('Set true');
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();

        // Step 8: Verify Publication in preview of changes
        BulkEditActions.verifyMessageBannerInAreYouSureForm(3);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          folioInstanceWithoutPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          '',
        );
        BulkEditSearchPane.verifyPublicationTableInForm(
          BULK_EDIT_FORMS.ARE_YOU_SURE,
          folioInstanceWithPublication.instanceHrid,
          folioInstanceWithPublication.publication[0].publisher,
          folioInstanceWithPublication.publication[0].role,
          folioInstanceWithPublication.publication[0].place,
          folioInstanceWithPublication.publication[0].dateOfPublication,
        );

        marcInstanceWithPublication.publications.forEach((publication) => {
          BulkEditSearchPane.verifyPublicationTableInForm(
            BULK_EDIT_FORMS.ARE_YOU_SURE,
            marcInstanceWithPublication.instanceHrid,
            publication.publisher,
            publication.role,
            publication.place,
            publication.dateOfPublication,
          );
        });

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          folioInstanceWithPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'true',
        );

        // Step 9: Download preview changes
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          folioPublicationInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          marcPublicationInFile,
        );

        // Step 10: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(3);

        // Step 11: Verify Publication in changed records
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          folioInstanceWithoutPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          '',
        );
        BulkEditSearchPane.verifyPublicationTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
          folioInstanceWithPublication.instanceHrid,
          folioInstanceWithPublication.publication[0].publisher,
          folioInstanceWithPublication.publication[0].role,
          folioInstanceWithPublication.publication[0].place,
          folioInstanceWithPublication.publication[0].dateOfPublication,
        );

        marcInstanceWithPublication.publications.forEach((publication) => {
          BulkEditSearchPane.verifyPublicationTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
            marcInstanceWithPublication.instanceHrid,
            publication.publisher,
            publication.role,
            publication.place,
            publication.dateOfPublication,
          );
        });

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          folioInstanceWithPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          'true',
        );

        // Step 12: Download changed records
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          folioPublicationInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          marcPublicationInFile,
        );

        // remove earlier downloaded files
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);

        // Steps 13-14: Verify logs and downloadable files
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.clickActionsRunBy(user.username);
        BulkEditLogs.verifyLogsRowActionWhenCompleted();

        // Step 15: Click on the "File with the matching records" hyperlink, Check display of "Publication" Instance data
        BulkEditLogs.downloadFileWithMatchingRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          folioPublicationInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          marcPublicationInFile,
        );

        // Step 16: Click on the "File with the preview of proposed changes (CSV)" hyperlink, Check display of "Publication" Instance data
        BulkEditLogs.downloadFileWithProposedChanges();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          folioPublicationInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          marcPublicationInFile,
        );

        // Step 17: Click on the "File with updated records (CSV)" hyperlink, Check display of "Publication" Instance data
        BulkEditLogs.downloadFileWithUpdatedRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          folioPublicationInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          folioInstanceWithoutPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithPublication.instanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PUBLICATION,
          marcPublicationInFile,
        );
      },
    );
  });
});
