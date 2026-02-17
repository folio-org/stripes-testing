import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';

let user;
let instanceTypeId;
let testInstances;
let instanceUUIDsFileName;
let fileNames;

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Instances with source MARC', () => {
      beforeEach('create test data', () => {
        cy.clearLocalStorage();
        testInstances = [
          {
            type: 'FOLIO',
            title: `AT_C478255_FolioInstance_${getRandomPostfix()}`,
            instanceId: null,
          },
          {
            type: 'MARC',
            title: `AT_C478255_MarcInstance_${getRandomPostfix()}`,
            instanceId: null,
          },
        ];
        instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
        fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.bulkEditQueryView.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // make sure there are no duplicate records in the system
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C478255');

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
                  cy.createSimpleMarcBibViaAPI(instance.title).then((instanceId) => {
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

      afterEach('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        testInstances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.instanceId);
        });
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C478255 Verify combined Bulk Edit form for MARC Instances (firebird)',
        { tags: ['criticalPath', 'firebird', 'C478255'] },
        () => {
          // Step 1: Select "Inventory - instances" radio button and "Instance UUIDs" option
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

          // Step 2: Upload .csv file with valid Instances UUIDs
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          // Step 3: Check the result of uploading the .csv file with Instances UUIDs
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

          // Step 4: Click "Actions" menu
          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false, true);
          BulkEditActions.verifyStartBulkEditOptions();

          // Step 5-6: Select "Instances with source MARC" option
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditMarcFieldsForm(
            instanceUUIDsFileName,
            '2 instance',
          );

          // Step 7: Verify elements under 'Bulk edits for administrative data' accordion
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();

          // Step 8: Verify administrative data options available
          BulkEditActions.clickOptionsSelection();

          [
            'Administrative note',
            'Staff suppress',
            'Statistical code',
            'Suppress from discovery',
          ].forEach((option) => {
            BulkEditActions.verifyOptionExistsInSelectOptionDropdown(option);
          });

          // Step 9: Verify elements under 'Bulk edits for instances with source MARC' accordion
          BulkEditActions.verifyInitialStateBulkEditMarcFieldsForm(
            instanceUUIDsFileName,
            '2 instance',
          );

          // Step 10: Verify form displays correctly
          BulkEditActions.hoverInfoIconAndVerifyText('Bulk edit of 00x fields is not supported.');

          // Step 11: Verify the title of HTML page
          cy.title().should('eq', 'Bulk edit - Bulk edit MARC fields - FOLIO');

          // Step 12: Test "Field*" column validation
          BulkEditActions.typeValueInTagField('5001');
          BulkEditActions.verifyTagField('500');

          // Step 13: Delete the entered text from the textbox in "Field*" column, enter '001'
          BulkEditActions.typeValueInTagField('001');
          BulkEditActions.verifyInvalidValueInTagField(
            'Bulk edit of MARC control fields 00X is not supported.',
          );

          // Step 14: Verify "In.1*" column
          BulkEditActions.typeValueInInd1Field('11');
          BulkEditActions.verifyInd1Field('1');

          // Step 15: Type empty space in textbox in "In.1*" column
          BulkEditActions.typeValueInInd1Field(' ');
          BulkEditActions.clickInd2Field();
          BulkEditActions.verifyInd1Field('\\');

          // Step 16: Delete backslash character "\" from the textbox in "In.1*" column
          BulkEditActions.removeValueInInd1Field();
          BulkEditActions.clickInd2Field();
          BulkEditActions.verifyInd1Field('\\');

          // Step 17: Try to enter more than one character (e.g. "33") in the textbox in "In.2*"
          BulkEditActions.typeValueInInd2Field('33');
          BulkEditActions.verifyInd2Field('3');

          // Step 18: Type empty space in textbox in "In.2*" column
          BulkEditActions.typeValueInInd2Field(' ');
          BulkEditActions.clickInd1Field();
          BulkEditActions.verifyInd2Field('\\');

          // Step 19: Delete backslash character "\" from the textbox in "In.2*" column
          BulkEditActions.removeValueInInd2Field();
          BulkEditActions.clickInd1Field();
          BulkEditActions.verifyInd2Field('\\');

          // Step 20: Verify "Subfield" column
          BulkEditActions.typeValueInSubfield('ab');
          BulkEditActions.verifySubfield('a');

          // Step 21: Verify action options
          BulkEditActions.verifyTheActionOptionsForMarcInstances(['Add', 'Find', 'Remove all']);

          // Step 22: Select "Add" option
          BulkEditActions.selectActionForMarcInstance('Add');

          // Step 23: Test adding new row
          BulkEditActions.addNewBulkEditFilterString(true);
          BulkEditActions.verifyTagAndIndicatorsAndSubfieldValues('', '\\', '\\', '', 1);
          BulkEditActions.verifyNewBulkEditRowInMarcInstanceAccordion();
          BulkEditActions.selectActionForMarcInstance('Add', 1);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 24: Test deleting row
          BulkEditActions.deleteRowInBulkEditMarcInstancesAccordion(1);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.verifyRowIcons(true);

          // Step 25: Cancel the bulk edit form
          BulkEditActions.closeBulkEditForm();
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

          // Step 26: Test Query functionality
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          // Step 27: Build any query and click "Run query" button
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInValueTextfield('AT_C478255');
          cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
          QueryModal.clickRunQuery();

          // Step 28: Wait for query results and open bulk edit form
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyBulkEditQueryPaneExists();
          BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 instance');
          BulkEditActions.openActions();
          BulkEditActions.openStartBulkEditMarcInstanceForm();

          // Step 29: Verify the header of "Bulk edit" form
          BulkEditActions.verifyBulkEditMarcFieldsFormHeaderAfterQuery(
            '2 instance',
            '(instance.title starts with AT_C478255)',
          );

          // Step 30: Verify the title of HTML page
          cy.title().should('eq', 'Bulk edit - Bulk edit MARC fields - FOLIO');

          // Step 31: Select any option from the "Select action" dropdown in "Actions*" column (e.g. "Find")
          BulkEditActions.selectActionForMarcInstance('Add');
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 32: Click  "X" icon on the "Bulk edit" form
          BulkEditActions.closeBulkEditForm();
          BulkEditSearchPane.verifyBulkEditQueryPaneExists();
          BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 instance');

          testInstances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.title,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
              instance.title,
            );
          });

          // Step 33: Reopen the "Bulk edit" form
          BulkEditActions.openActions();
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

          // Step 34: Test MARC field validation with various scenarios
          BulkEditActions.typeValueInTagField('536');
          BulkEditActions.verifyTagField('536');
          BulkEditActions.selectActionForMarcInstance('Remove all');
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 35: Fill in "In.1*" , "In.2*" column and "Subfield*" column
          BulkEditActions.fillInInd1FieldAndVerify('ա');
          BulkEditActions.fillInInd2FieldAndVerify('բ');
          BulkEditActions.typeValueInSubfield('a');
          BulkEditActions.verifySubfield('a');
          BulkEditActions.verifyInvalidValueInIndFields(true, true);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 36: Verify that special symbol is entered in both textboxes
          BulkEditActions.fillInInd1FieldAndVerify('~');
          BulkEditActions.fillInInd2FieldAndVerify('~');
          BulkEditActions.verifyInvalidValueInIndFields(true, true);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 37: Enter valid values in both "In.1*" and "In.2*" columns
          BulkEditActions.fillInInd1FieldAndVerify('a');
          BulkEditActions.fillInInd2FieldAndVerify('b');
          BulkEditActions.typeValueInSubfield('ա');
          BulkEditActions.verifySubfield('ա');
          BulkEditActions.verifyInvalidValueInSubfield();
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 38: Enter special symbol  (e.g. ">")
          BulkEditActions.typeValueInSubfield('>');
          BulkEditActions.verifySubfield('>');
          BulkEditActions.verifyInvalidValueInSubfield();
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 39: Enter value in upper case  (e.g. "B")
          BulkEditActions.typeValueInSubfield('B');
          BulkEditActions.verifySubfield('B');
          BulkEditActions.verifyInvalidValueInSubfield();
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 40: Enter valid value (e.g. "b")
          BulkEditActions.typeValueInSubfield('b');
          BulkEditActions.verifySubfield('b');
          BulkEditActions.verifyConfirmButtonDisabled(false);
        },
      );
    });
  },
);
