import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import SelectBulkEditProfileModal from '../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  BULK_EDIT_FORMS,
} from '../../../support/constants';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import { getLongDelay } from '../../../support/utils/cypressTools';
import {
  createBulkEditProfileBody,
  MarcRules,
  MarcActionCreators,
} from '../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';

const { createMarcFieldRule } = MarcRules;

// Profile factory functions
const createMainProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C788738_MarcInstancesProfile_${getRandomPostfix()}`,
    description: 'Test MARC instances profile for 080 and 919 field operations',
    entityType: 'INSTANCE_MARC',
    marcRuleDetails: [
      createMarcFieldRule('080', '\\', '\\', 'a', [
        MarcActionCreators.find('821.113.1'),
        MarcActionCreators.append('2', '[edition information]'),
      ]),
      createMarcFieldRule('919', '\\', '\\', 'a', [MarcActionCreators.removeAll()]),
    ],
  });
};

const createSecondProfileBody = () => {
  return createBulkEditProfileBody({
    name: `Test_InstancesProfile_${getRandomPostfix()}`,
    description: 'Test profile for executing bulk edit job',
    entityType: 'INSTANCE_MARC',
    marcRuleDetails: [
      createMarcFieldRule('500', '1', '0', 'a', [
        MarcActionCreators.addToExisting('Original MARC note data'),
      ]),
    ],
  });
};

let user;
let bulkEditJobId;
let queryFileNames;
const classificationTableHeadersInFile = 'Classification identifier type;Classification\n';
const testData = {
  profileIds: [],
  marcInstanceTitle: `AT_C788738_MarcInstance_${getRandomPostfix()}`,
  marcField080: '821.113.1',
  marcField919: 'Test 919 field content',
  subfield2: '[edition information]',
  editedClassification: '821.113.1',
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    before('Create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.bulkEditLogsView.gui,
        Permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getAdminUserDetails().then((record) => {
          testData.adminSourceRecord = record;
        });

        // Create main profile with factory
        const mainProfile = createMainProfileBody();
        cy.createBulkEditProfile(mainProfile).then((profile) => {
          testData.profileName = profile.name;
          testData.profileDescription = profile.description;
          testData.profileIds.push(profile.id);
        });

        // Create second profile with factory
        const secondProfile = createSecondProfileBody();
        cy.createBulkEditProfile(secondProfile).then((profile) => {
          testData.secondProfileName = profile.name;
          testData.secondProfileDescription = profile.description;
          testData.profileIds.push(profile.id);
        });

        // Create MARC Instance with required fields
        const marcFields = [
          {
            tag: '008',
            content: QuickMarcEditor.defaultValid008Values,
          },
          {
            tag: '080',
            content: `$a${testData.marcField080}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '245',
            content: `$a${testData.marcInstanceTitle}`,
            indicators: ['1', '0'],
          },
          {
            tag: '919',
            content: `$a${testData.marcField919}`,
            indicators: ['\\', '\\'],
          },
        ];

        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcFields).then(
          (instanceId) => {
            testData.marcInstanceId = instanceId;

            cy.getInstanceById(instanceId).then((instance) => {
              testData.marcInstanceHrid = instance.hrid;
            });

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            BulkEditSearchPane.openQuerySearch();
            BulkEditSearchPane.checkInstanceRadio();
            BulkEditSearchPane.clickBuildQueryButton();
            QueryModal.verify();
            QueryModal.selectField(instanceFieldValues.instanceId);
            QueryModal.selectOperator(QUERY_OPERATIONS.IN);
            QueryModal.fillInValueTextfield(testData.marcInstanceId);
            cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
            QueryModal.clickTestQuery();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.clickRunQuery();
            QueryModal.verifyClosed();
            cy.wait('@getPreview', getLongDelay()).then((interception) => {
              const interceptedUuid = interception.request.url.match(
                /bulk-operations\/([a-f0-9-]+)\/preview/,
              )[1];
              bulkEditJobId = interceptedUuid;
              queryFileNames = BulkEditFiles.getAllQueryDownloadedFileNames(bulkEditJobId, true);
            });
          },
        );
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      testData.profileIds.forEach((id) => cy.deleteBulkEditProfile(id, true));

      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.marcInstanceId);
      BulkEditFiles.deleteAllDownloadedFiles(queryFileNames);
    });

    it(
      'C788738 Executing bulk edit job using MARC Instance bulk edit profile (080, 919) (Query, Logs) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C788738'] },
      () => {
        // Step 1: Click "Actions" menu
        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false, true);
        BulkEditActions.verifyStartBulkEditOptions();

        // Step 2: In the list of available column names uncheck checkboxes next to the options
        // that are going to be edited based on the bulk edit profile
        BulkEditSearchPane.uncheckShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
        );

        // Step 3: Click "Select instances bulk edit profile"
        BulkEditActions.clickSelectBulkEditProfile('instances with source MARC');
        SelectBulkEditProfileModal.waitLoading('instances with source MARC');
        SelectBulkEditProfileModal.verifyAllModalElements();

        // Step 4: Verify the table with the list of existing instances bulk edit profiles
        SelectBulkEditProfileModal.verifyProfileInTable(
          testData.profileName,
          testData.profileDescription,
          testData.adminSourceRecord,
        );
        SelectBulkEditProfileModal.verifyProfileInTable(
          testData.secondProfileName,
          testData.secondProfileDescription,
          testData.adminSourceRecord,
        );
        SelectBulkEditProfileModal.verifyProfilesSortedByName();
        SelectBulkEditProfileModal.changeSortOrderByName();
        SelectBulkEditProfileModal.verifyProfilesSortedByName('descending');
        SelectBulkEditProfileModal.changeSortOrderByUpdatedDate();
        SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedDate();
        SelectBulkEditProfileModal.changeSortOrderByUpdatedBy();
        SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedBy();
        SelectBulkEditProfileModal.searchProfile('at_C788738');
        SelectBulkEditProfileModal.verifyProfileInTable(
          testData.profileName,
          testData.profileDescription,
          testData.adminSourceRecord,
        );
        SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);
        SelectBulkEditProfileModal.searchProfile(testData.profileName);
        SelectBulkEditProfileModal.verifyProfileInTable(
          testData.profileName,
          testData.profileDescription,
          testData.adminSourceRecord,
        );
        SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);

        // Step 5: Verify the count of the profiles in the header is correct
        SelectBulkEditProfileModal.verifyProfilesFoundText();

        // Step 6: Click on the row with MARC Instances bulk edit profile from Preconditions
        SelectBulkEditProfileModal.selectProfile(testData.profileName);
        SelectBulkEditProfileModal.verifyModalClosed('instances with source MARC');
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyClassificationTableInForm(
          BULK_EDIT_FORMS.ARE_YOU_SURE,
          testData.marcInstanceHrid,
          'UDC',
          testData.marcField080,
        );
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

        // Step 7: Click the "Download preview in CSV format" button
        BulkEditActions.downloadPreview();

        const classificationInFile = `${classificationTableHeadersInFile}UDC;${testData.marcField080}`;

        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.marcInstanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          classificationInFile,
        );

        // Step 8: Click "Download preview in MARC format" button
        BulkEditActions.downloadPreviewInMarcFormat();

        const assertionsOnMarcFileContent = [
          {
            uuid: testData.marcInstanceId,
            assertions: [
              (record) => {
                const field080 = record.get('080')[0];

                expect(field080.ind1).to.eq(' ');
                expect(field080.ind2).to.eq(' ');
                expect(field080.subf[0][0]).to.eq('a');
                expect(field080.subf[0][1]).to.eq(testData.marcField080);
                expect(field080.subf[1][0]).to.eq('2');
                expect(field080.subf[1][1]).to.eq(testData.subfield2);
              },

              (record) => expect(record.get('919')).to.be.empty,
            ],
          },
        ];

        parseMrcFileContentAndVerify(
          queryFileNames.previewRecordsMarc,
          assertionsOnMarcFileContent,
          1,
        );

        // Step 9: Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyClassificationTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
          testData.marcInstanceHrid,
          'UDC',
          testData.marcField080,
        );

        // Step 10: Click the "Actions" menu and Select "Download changed records (CSV)" element
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.marcInstanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          classificationInFile,
        );

        // Step 11: Click "Actions" menu and Select "Download changed records (MARC)" option
        BulkEditActions.downloadChangedMarc();

        parseMrcFileContentAndVerify(
          queryFileNames.changedRecordsMarc,
          assertionsOnMarcFileContent,
          1,
        );

        // remove earlier downloaded files
        BulkEditFiles.deleteAllDownloadedFiles(queryFileNames);

        // Step 12: Click "Logs" toggle in "Set criteria" pane and Check "Inventory - instances" checkbox
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.clickActionsRunBy(user.username);

        // Step 13: Click on the "..." action element in the row with recently completed bulk edit job
        BulkEditLogs.verifyLogsRowActionWhenCompletedWithQuery(true);

        // Step 14: Click on the "File with identifiers of the records affected by bulk update"
        BulkEditLogs.downloadQueryIdentifiers();
        ExportFile.verifyFileIncludes(queryFileNames.identifiersQueryFilename, [
          testData.marcInstanceId,
        ]);

        // Step 15: Click on the "File with the matching records" hyperlink
        BulkEditLogs.downloadFileWithMatchingRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.matchedRecordsQueryFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.marcInstanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          classificationInFile,
        );

        // Step 16: Click on the "File with the preview of proposed changes (CSV)" hyperlink
        BulkEditLogs.downloadFileWithProposedChanges();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.marcInstanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          classificationInFile,
        );

        // Step 17: Click on the "File with the preview of proposed changes (MARC)" hyperlink
        BulkEditLogs.downloadFileWithProposedChangesMarc();

        parseMrcFileContentAndVerify(
          queryFileNames.previewRecordsMarc,
          assertionsOnMarcFileContent,
          1,
        );

        // Step 18: Click on the "File with updated records (CSV)" hyperlink
        BulkEditLogs.downloadFileWithUpdatedRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          testData.marcInstanceHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CLASSIFICATION,
          classificationInFile,
        );

        // Step 19: Click on the "File with updated records (MARC)" hyperlink
        BulkEditLogs.downloadFileWithUpdatedRecordsMarc();

        parseMrcFileContentAndVerify(
          queryFileNames.changedRecordsMarc,
          assertionsOnMarcFileContent,
          1,
        );

        // Step 20: Navigate to the "Inventory" app, search for the recently edited MARC Instances
        // Verify that made changes have been applied
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByHRID(testData.marcInstanceHrid);
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyClassification('UDC', testData.marcField080);

        // Step 21: Click "Actions" menu, Select "View source" option, Verify that made changes
        // have been applied to MARC bibliographic record
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(
          '080',
          `\t080\t   \t$a ${testData.marcField080} $2 ${testData.subfield2}`,
        );
        InventoryViewSource.verifyAbsenceOfValue('919\t');
        InventoryViewSource.verifyFieldContent(
          3,
          DateTools.getFormattedEndDateWithTimUTC(new Date()),
        );
      },
    );
  });
});
