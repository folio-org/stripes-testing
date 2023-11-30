import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Users from '../../../../support/fragments/users/users';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Bibliographic -> Edit MARC bib', () => {
  const testData = {
    initialSource: { name: 'Diku_admin' },
    authority: {
      source: 'MARC',
      searchInput: 'C350697 On the Road',
    },
    edited100Field: {
      tag: '100',
      rowIndex: 16,
      content: ['edited 100 - once', 'edited 100 - twice', 'edited 100 - three times'],
    },
    added500Fields: {
      tag: '500',
      content: ['added 500 - once', 'added 500 - twice', 'added 500 - three times'],
    },
    deletedFieldsTags: ['511', '520', '521'],
  };
  const marcFile = {
    marc: 'marcBibFileForC350697.mrc',
    fileName: `testMarcFileC350697.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };
  let instanceId;

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          instanceId = link.split('/')[5];
        });
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(instanceId);
  });

  it(
    'C350697 Edit a MARC bibliographic record via quickmarc multiple times (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      // #1-#2 Click on the "Source" accordion button, Check thе "MARC" checkbox.
      InventoryInstances.searchBySource(testData.authority.source);
      InventoryInstance.searchByTitle(testData.authority.searchInput);
      // #3 View an instance record, by clicking on any record at result pane.
      InventoryInstances.selectInstanceById(instanceId);
      // Detail view of the "Instance" record opened at third pane.
      InventoryInstance.waitLoading();
      // #4-#5 Click on "Record last updated" accordion button.Verify that "Source" value does not match with your user's name.
      // The "Source" value does not match with your user's name.
      InventoryInstance.verifyLastUpdatedUser(testData.initialSource.name);

      testData.deletedFieldsTags.forEach((deletedFieldTag, index) => {
        // #6 Click on the "Actions" dropdown menu button and choose the "Edit MARC bibliographic record" option.
        InventoryInstance.editMarcBibliographicRecord();
        // The "MARC bibliographic" record editing window is open.
        QuickMarcEditor.waitLoading();
        // #7 Verify that the "Source" value is equal to user's name of user which updated "MARC Bibliographic" record last time.
        // The "Source" value is equal to the user's name of user that updated the record last time.
        if (index === 0) {
          QuickMarcEditor.checkPaneheaderContains(testData.initialSource.name);
        } else {
          QuickMarcEditor.checkPaneheaderContains(testData.userProperties.username);
        }
        // #8 Add a new MARC tag [For example: "5XX"] with value "$a Added tag".
        QuickMarcEditor.addNewField(
          testData.added500Fields.tag,
          testData.added500Fields.content[index],
          33,
        );
        // *New tag displayed with entered value.
        QuickMarcEditor.verifyTagValue(34, testData.added500Fields.tag);
        QuickMarcEditor.checkContent(testData.added500Fields.content[index], 34);
        // *The "Save & close" button became clickable.
        QuickMarcEditor.verifySaveAndCloseButtonEnabled();
        // #9 Delete an existing MARC tag (NOT 035, 1XX).
        QuickMarcEditor.deleteField(29);
        // *A tag deleted.
        QuickMarcEditor.checkAfterDeleteField(deletedFieldTag);
        // *The "Save & close" button stays clickable.
        QuickMarcEditor.verifySaveAndCloseButtonEnabled();
        // #10 Edit $a subfield at 1XX MARC tag.
        QuickMarcEditor.updateExistingField(
          testData.edited100Field.tag,
          testData.edited100Field.content[index],
        );
        // *The $a subfield at 1XX MARC tag edited.
        QuickMarcEditor.checkContent(
          testData.edited100Field.content[index],
          testData.edited100Field.rowIndex,
        );
        // *The "Save & close" button stays clickable.
        QuickMarcEditor.verifySaveAndCloseButtonEnabled();
        // #11 Click on the "Save & close" button.
        QuickMarcEditor.pressSaveAndClose();
        // *The success saving message is displayed.
        // *Detail record opened in the third pane.
        QuickMarcEditor.confirmDelete();
        QuickMarcEditor.checkAfterSaveAndClose();
        // #12 Verify that changes are saved by clicking on the "Action" button and choose the "View source" option.
        InventoryInstance.viewSource();
        InventoryViewSource.waitLoading();
        // The "MARC bibliographic" record is displayed at a new pane with saved changes.
        InventoryViewSource.verifyFieldInMARCBibSource(
          testData.added500Fields.tag,
          testData.added500Fields.content[index],
        );
        InventoryViewSource.verifyFieldInMARCBibSource(
          testData.edited100Field.tag,
          testData.edited100Field.content[index],
        );
        InventoryViewSource.verifyAbsenceOfValueInRow(deletedFieldTag, 29);
        // #13 Return to the "Instance" record by clicking on "X"icon.
        InventoryViewSource.close();
        // Detail view of "Instance" record opened in the third pane.
        InventoryInstance.waitLoading();
        // #14 Click on the "Record last updated" accordion button, inside the "Administrative data" accordion.
        // The accordion expanded and displayed the following values:
        // *Updated "Record last updated" value - displayed current time.
        // *Updated "Source" value - displayed your user's name.
        InventoryInstance.verifyLastUpdatedUser(testData.userProperties.username);
        InventoryInstance.verifyLastUpdatedDate();
      });
    },
  );
});
