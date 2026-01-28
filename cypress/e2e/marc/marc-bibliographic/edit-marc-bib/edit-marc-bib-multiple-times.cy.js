import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        authority: {
          source: INSTANCE_SOURCE_NAMES.MARC,
          searchInput: 'C350697 On the Road',
        },
        edited100Field: {
          tag: '100',
          rowIndex: 15,
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
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };
      let instanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getAdminSourceRecord().then((sourceRecord) => {
          testData.initialSource = sourceRecord;
        });
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('C350697*');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              instanceId = record[marcFile.propertyName].id;
            });
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
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
        { tags: ['extendedPath', 'spitfire', 'C350697'] },
        () => {
          // #1-#2 Click on the "Source" accordion button, Check thе "MARC" checkbox.
          InventoryInstances.searchBySource(testData.authority.source);
          InventoryInstances.searchByTitle(testData.authority.searchInput);
          // #3 View an instance record, by clicking on any record at result pane.
          InventoryInstances.selectInstanceById(instanceId);
          // Detail view of the "Instance" record opened at third pane.
          InventoryInstance.waitLoading();
          // #4-#5 Click on "Record last updated" accordion button.Verify that "Source" value does not match with your user's name.
          // The "Source" value does not match with your user's name.
          InventoryInstance.verifyLastUpdatedUser(testData.initialSource);

          testData.deletedFieldsTags.forEach((deletedFieldTag, index) => {
            // #6 Click on the "Actions" dropdown menu button and choose the "Edit MARC bibliographic record" option.
            InventoryInstance.editMarcBibliographicRecord();
            // The "MARC bibliographic" record editing window is open.
            QuickMarcEditor.waitLoading();
            // #7 Verify that the "Source" value is equal to user's name of user which updated "MARC Bibliographic" record last time.
            // The "Source" value is equal to the user's name of user that updated the record last time.
            if (index === 0) {
              QuickMarcEditor.checkPaneheaderContains(testData.initialSource);
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
            QuickMarcEditor.deleteField(28);
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
            // *The success saving message is displayed.
            // *Detail record opened in the third pane.
            QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
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
            InventoryViewSource.verifyAbsenceOfValueInRow(deletedFieldTag, 28);
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
  });
});
