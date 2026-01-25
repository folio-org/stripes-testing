import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const testData = {
        authorityC360092: {
          searchInput: 'C360092 Jackson, Peter',
          searchOption: 'Keyword',
        },
        authorityC360093: {
          searchInput: 'C360093 Jackson, Peter',
          searchOption: 'Keyword',
        },
        editedFieldsC360092: [
          {
            tag: '100',
            content: 'C360092 Jackson, Peter - edited',
          },
          {
            tag: '010',
            content: '010 - edited',
          },
        ],
        editedFieldC360093: {
          tag: '010',
          content: '010 - edited',
          secondContent: '010 - edited twice',
        },
        newField: {
          tag: '555',
          content: 'Added row',
        },
        deletedField: { tag: '370' },
      };
      const subfieldPrefix = '$a';
      const authorityPostfix = '?authRefType=Authorized&heading';
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const headerContent = {
        initialHeaderContent: {
          marcData: {
            headingTypeFrom1XX: 'C360092 Jackson, Peter,',
            headingType: 'Personal name',
            status: 'Current',
          },
        },
        editedHeaderContent: {
          source: { name: 'testPermFirst' },
          marcData: {
            headingTypeFrom1XX: 'C360092 Jackson, Peter - edited',
            headingType: 'Personal name',
            status: 'Current',
          },
        },
      };
      const marcFiles = [
        {
          marc: 'marcAuthFileForC360092.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          numOfRecords: 1,
          propertyName: 'authority',
        },
        {
          marc: 'marcAuthFileForC360093.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ];
      const createdAuthorityIDs = [];
      let adminUser;

      before('Upload files', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C360092');
        cy.getAdminSourceRecord().then((record) => {
          adminUser = record;
        });
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
            },
          );
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          headerContent.editedHeaderContent.source.firstName = testData.userProperties.username;
        });
      });

      beforeEach('Visit MARC Authorities', () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password);
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.waitLoading();
        }, 20_000);
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C360092 Verify that click on the "Save & keep editing" button doesnt close the editing window of "MARC Authority" record (spitfire) (TaaS)',
        { tags: ['extendedPathBroken', 'spitfire', 'C360092'] },
        () => {
          MarcAuthorities.searchBy(
            testData.authorityC360092.searchOption,
            testData.authorityC360092.searchInput,
          );
          MarcAuthorities.select(`${createdAuthorityIDs[0]}${authorityPostfix}`);
          MarcAuthority.edit();
          // Verify initial state of edit view
          QuickMarcEditor.checkHeaderFirstLine(
            headerContent.initialHeaderContent.marcData,
            adminUser,
          );
          QuickMarcEditor.checkButtonsDisabled();

          // Edit record and verify button states updated
          MarcAuthority.changeField(
            testData.editedFieldsC360092[0].tag,
            `${subfieldPrefix}${testData.editedFieldsC360092[0].content}`,
          );
          QuickMarcEditor.checkButtonsEnabled();

          // Save edits and verify view updated
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkHeaderFirstLine(
            headerContent.editedHeaderContent.marcData,
            `${headerContent.editedHeaderContent.source.firstName}, ${headerContent.editedHeaderContent.source.name}`,
          );

          // Add field and verify button states updated
          MarcAuthority.addNewField(4, testData.newField.tag, testData.newField.content);
          QuickMarcEditor.checkButtonsEnabled();

          // Save added field and verify view updated
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkHeaderFirstLine(
            headerContent.editedHeaderContent.marcData,
            `${headerContent.editedHeaderContent.source.firstName}, ${headerContent.editedHeaderContent.source.name}`,
          );

          // Delete added field and verify states
          cy.wait(4000);
          QuickMarcEditor.deleteFieldByTagAndCheck(testData.newField.tag);
          QuickMarcEditor.checkButtonsEnabled();

          // Save deletion and verify modal
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkDeleteModal(1);
          QuickMarcEditor.confirmDelete();
          QuickMarcEditor.closeAllCallouts();

          // // Confirm deletion and verify view updated
          QuickMarcEditor.checkFieldAbsense();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkHeaderFirstLine(
            headerContent.editedHeaderContent.marcData,
            `${headerContent.editedHeaderContent.source.firstName}, ${headerContent.editedHeaderContent.source.name}`,
          );

          // Restore deleted field and verify states
          QuickMarcEditor.deleteFieldByTagAndCheck(testData.deletedField.tag);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.clickRestoreDeletedField();
          QuickMarcEditor.checkButtonsDisabled();

          // Reorder field and verify states updated
          cy.wait(2000);
          QuickMarcEditor.moveFieldUp(5);
          QuickMarcEditor.checkButtonsEnabled();

          // Save field reordering and verify view updated
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkHeaderFirstLine(
            headerContent.editedHeaderContent.marcData,
            `${headerContent.editedHeaderContent.source.firstName}, ${headerContent.editedHeaderContent.source.name}`,
          );

          // Edit 010 field and verify states updated
          cy.wait(2000);
          MarcAuthority.changeField(
            testData.editedFieldsC360092[1].tag,
            `${subfieldPrefix} ${testData.editedFieldsC360092[1].content}`,
          );
          QuickMarcEditor.checkButtonsEnabled();

          // Save and close edit view
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.contains(testData.editedFieldsC360092[0].content);
          MarcAuthority.contains(testData.editedFieldsC360092[1].content);
          MarcAuthority.checkTagInRow(4, '016');
        },
      );

      it(
        'C360093 Verify that updates are saved after clicking "Save & keep editing" button in the editing window of "MARC Authority" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C360093'] },
        () => {
          MarcAuthorities.searchBy(
            testData.authorityC360093.searchOption,
            testData.authorityC360093.searchInput,
          );
          MarcAuthorities.select(`${createdAuthorityIDs[1]}${authorityPostfix}`);
          MarcAuthority.edit();

          // Add text to subfield, click Save and keep editing
          MarcAuthority.changeField(
            testData.editedFieldC360093.tag,
            `${subfieldPrefix} ${testData.editedFieldC360093.content}`,
          );
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          cy.wait(1500);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkContent(
            `${subfieldPrefix} ${testData.editedFieldC360093.content}`,
            4,
          );

          // Close editor and reopen, verify previous edits present
          QuickMarcEditor.closeAuthorityEditorPane();
          MarcAuthority.edit();
          QuickMarcEditor.checkContent(
            `${subfieldPrefix} ${testData.editedFieldC360093.content}`,
            4,
          );

          // Change field again, click Save and keep editing
          MarcAuthority.changeField(
            testData.editedFieldC360093.tag,
            `${subfieldPrefix}${testData.editedFieldC360093.secondContent}`,
          );
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          cy.wait(1500);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkContent(
            `${subfieldPrefix} ${testData.editedFieldC360093.secondContent}`,
            4,
          );

          // Click on the "Back to the previous page" browser button, verify changes in marc view pane.
          cy.wait(3000);
          cy.go('back');
          MarcAuthority.contains(testData.editedFieldC360093.secondContent);
        },
      );
    });
  });
});
