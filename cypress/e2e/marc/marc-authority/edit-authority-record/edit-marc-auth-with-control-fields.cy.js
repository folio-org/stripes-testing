import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { getAuthoritySpec } from '../../../../support/api/specifications-helper';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import FileManager from '../../../../support/utils/fileManager';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const TAG = '002'; // Local control field tag
      let authSpecId;
      let localFieldId;

      const fieldPayload = {
        tag: TAG,
        label: 'AT Custom Field - Local Authority Subfield Test',
        url: 'http://www.example.org/field002.html',
        repeatable: false,
        required: false,
        deprecated: false,
      };

      const testData = {
        title: 'C503163 Edit MARC auth which has control fields with or without subfield Sa',
        searchOption: 'Keyword',
        searchText: 'C503163 Edit MARC auth which has control fields',
        newContentFor110Field:
          '$a C503163 Edit MARC auth which has control fields with or without subfield Sa test',
        tag002: '002',
        tag003: '003',
        tag004: '004',
        tag009: '009',
        editMarcHeader: /Edit .*MARC authority record/,
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
      const propertyName = 'authority';
      let createdAuthorityID;

      const controlFieldWithoutIndicator = [
        { tag: testData.tag002, content: 'FOLIO23491', rowIndex: 3 },
        { tag: testData.tag003, content: 'FOLIO23492', rowIndex: 4 },
        { tag: testData.tag004, content: 'FOLIO23493', rowIndex: 5 },
        { tag: testData.tag009, content: 'FOLIO23494', rowIndex: 6 },
      ];

      const controlFieldWithIndicator = [
        { tag: testData.tag002, content: '$a FOLIO23491', rowIndex: 3 },
        { tag: testData.tag003, content: '$a FOLIO23492', rowIndex: 4 },
        { tag: testData.tag004, content: '$a FOLIO23491', rowIndex: 5 },
        { tag: testData.tag009, content: '$a FOLIO23491', rowIndex: 6 },
      ];

      const expectedSourceControlFieldsWithoutIndicator = controlFieldWithoutIndicator.map(
        (field) => `${field.tag}\t${field.content}`,
      );

      const expectedSourceControlFieldsWithIndicator = controlFieldWithIndicator.map(
        (field) => `${field.tag}\t${field.content}`,
      );

      const csvFile = `C503163 exportedCSVFile${getRandomPostfix()}.csv`;
      const exportedMarcFile = `C503163 exportedMarcFile${getRandomPostfix()}.mrc`;

      before('Creating data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C503163*');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.specificationStorageGetSpecificationFields.gui,
          Permissions.specificationStorageCreateSpecificationField.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          Permissions.dataExportViewAddUpdateProfiles.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          getAuthoritySpec().then((authSpec) => {
            authSpecId = authSpec.id;

            // Clean up any existing field with the same tag and create a new one
            cy.deleteSpecificationFieldByTag(authSpecId, fieldPayload.tag, false).then(() => {
              cy.createSpecificationField(authSpecId, fieldPayload).then((fieldResp) => {
                expect(fieldResp.status).to.eq(201);
                localFieldId = fieldResp.body.id;
              });
            });
          });

          DataImport.uploadFileViaApi('marcAuthFileForC503163.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityID = record[propertyName].id;
              });
            },
          );

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Deleting data', () => {
        cy.getAdminToken();
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        FileManager.deleteFile(`cypress/fixtures/${exportedMarcFile}`);
        FileManager.deleteFile(`cypress/fixtures/${csvFile}`);
        if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID);
        Users.deleteViaApi(testData.userProperties.userId);
        if (localFieldId) {
          cy.deleteSpecificationFieldByTag(authSpecId, fieldPayload.tag, false);
        }
      });

      it(
        'C503163 Edit "MARC authority" record with control fields (002, 003, 004, 009) which have or dont have "$a" subfields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C503163'] },
        () => {
          // 0. User is on the detail view pane of imported record opened via "MARC authority" app.
          MarcAuthorities.searchBy(testData.searchOption, testData.searchText);
          MarcAuthorities.selectItem(testData.title, false);

          // 1. Click on the "Action" button on the third pane >> Select "Edit" option
          MarcAuthority.edit();
          QuickMarcEditor.checkPaneheaderContains(testData.editMarcHeader);
          // wait for the whole content to be loaded.
          cy.wait(2000);
          controlFieldWithoutIndicator.forEach((field, index) => {
            QuickMarcEditor.checkContent(field.content, 3 + index);
          });

          // 2. Update any field, ex.: add test in the "110" field
          QuickMarcEditor.updateExistingFieldContent(11, testData.newContentFor110Field);
          QuickMarcEditor.checkContent(testData.newContentFor110Field, 11);

          // 3. Click on the "Save & close" button.
          MarcAuthority.clickSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          expectedSourceControlFieldsWithoutIndicator.forEach((field) => {
            MarcAuthority.contains(field);
          });

          // 4. Click on the "Action" button on the third pane >> Select "Edit" option
          MarcAuthority.edit();
          QuickMarcEditor.checkPaneheaderContains(testData.editMarcHeader);
          // wait for the whole content to be loaded.
          cy.wait(2000);
          controlFieldWithoutIndicator.forEach((field, index) => {
            QuickMarcEditor.checkContent(field.content, 3 + index);
          });

          // 5. Add subfield indicators in each control field (002, 003, 004, 009) before stored value
          controlFieldWithIndicator.forEach((field) => {
            QuickMarcEditor.updateExistingFieldContent(field.rowIndex, field.content);
          });
          controlFieldWithIndicator.forEach((field, index) => {
            QuickMarcEditor.checkContent(field.content, 3 + index);
          });

          // 6. Click "Save & close" button
          MarcAuthority.clickSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          expectedSourceControlFieldsWithIndicator.forEach((field) => {
            MarcAuthority.contains(field);
          });

          // 7. Click on the "Action" button on the third pane >> Select "Edit" option
          MarcAuthority.edit();
          QuickMarcEditor.checkPaneheaderContains(testData.editMarcHeader);
          // wait for the whole content to be loaded.
          cy.wait(2000);
          controlFieldWithIndicator.forEach((field, index) => {
            QuickMarcEditor.checkContent(field.content, 3 + index);
          });

          // 8. Remove subfield indicators in each Local control field (002, 003, 004, 009) before stored value
          controlFieldWithoutIndicator.forEach((field) => {
            QuickMarcEditor.updateExistingFieldContent(field.rowIndex, field.content);
          });
          controlFieldWithoutIndicator.forEach((field, index) => {
            QuickMarcEditor.checkContent(field.content, 3 + index);
          });

          // 9. Click "Save & keep editing" button
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          controlFieldWithoutIndicator.forEach((field, index) => {
            QuickMarcEditor.checkContent(field.content, 3 + index);
          });

          // 10. Export edited record
          QuickMarcEditor.closeAuthorityEditorPane();
          MarcAuthorities.checkSelectAuthorityRecordCheckbox(testData.title);
          MarcAuthorities.checkSelectAuthorityRecordCheckboxChecked(testData.title);
          MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
          MarcAuthorities.exportSelected();
          cy.wait(1000);
          ExportFile.downloadCSVFile(csvFile, 'QuickAuthorityExport*');

          // 11. Go to "Data export" app and download exported ".mrc" file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          ExportFile.uploadFile(csvFile);
          ExportFile.exportWithDefaultJobProfile(csvFile, 'Default authority', 'Authorities');
          ExportFile.downloadExportedMarcFile(exportedMarcFile);
          ExportFile.verifyFileIncludes(exportedMarcFile, [
            'FOLIO23491',
            'FOLIO23492',
            'FOLIO23493',
            'FOLIO23494',
          ]);
        },
      );
    });
  });
});
