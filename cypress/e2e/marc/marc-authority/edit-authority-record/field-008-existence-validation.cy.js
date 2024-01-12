import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC -> MARC Authority -> Edit Authority record', () => {
  const testData = {
    authority: {
      searchInput: 'C387453 DC Talk (Musical group)',
      searchOption: 'Keyword',
    },
    tag00: '00',
    tag008: '008',
    tag008RowIndex: 5,
    expected008BoxesSets: [
      'Geo Subd',
      'Roman',
      'Lang',
      'Kind rec',
      'CatRules',
      'SH Sys',
      'Series',
      'Numb Series',
      'Main use',
      'Subj use',
      'Series use',
      'Subd type',
      'Govt Ag',
      'RefEval',
      'RecUpd',
      'Pers Name',
      'Level Est',
      'Mod Rec Est',
      'Source',
    ],
    tag008BoxValues: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    tag110: '110',
    tag110Value: '$a DC Talk (Musical group).$t Jesus freaks.$l Afrikaans test',
    calloutMessage:
      'This record has successfully saved and is in process. Changes may not appear immediately.',
    errorCalloutMessage: 'Record cannot be saved without 008 field',
    initial008EnteredValue: DateTools.getCurrentDateYYMMDD(),
  };
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const marcFiles = [
    {
      marc: 'marcAuthFileForC387453.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      numOfRecords: 1,
    },
  ];
  const createdAuthorityIDs = [];
  const currentDate = DateTools.getCurrentDateYYMMDD();

  before('Upload files', () => {
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        marcFiles.forEach((marcFile) => {
          DataImport.verifyUploadState();
          DataImport.uploadFile(marcFile.marc, marcFile.fileName);
          JobProfiles.search(jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              createdAuthorityIDs.push(link.split('/')[5]);
            });
          }
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C387453 "008" field existence validation when edit imported "MARC authority" (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.searchInput);
      MarcAuthorities.select(createdAuthorityIDs[0]);
      // #1 Click on "Actions" buttons in third pane → Select "Edit" option
      MarcAuthority.edit();
      QuickMarcEditor.checkTagAbsent(testData.tag008);
      // #2 Click "Cancel" button
      QuickMarcEditor.pressCancel();

      // #3 Click on "Actions" buttons in third pane → Select "Edit" option
      MarcAuthority.edit();
      QuickMarcEditor.checkTagAbsent(testData.tag008);

      // #4 Edit any field, for example: add "Test" to the "1XX" field.
      MarcAuthority.changeField(testData.tag110, testData.tag110Value);
      QuickMarcEditor.checkButtonsEnabled();

      // #5 Click "Save & close" button
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorCalloutMessage);
      QuickMarcEditor.closeCallout();

      // #6 Click "Save & keep editing" button
      QuickMarcEditor.clickSaveAndKeepEditingButton();
      QuickMarcEditor.checkCallout(testData.errorCalloutMessage);
      QuickMarcEditor.closeCallout();

      // #7 Add new field and fill MARC tag box with "008".
      QuickMarcEditor.addNewField(testData.tag008, '', testData.tag008RowIndex - 1);
      QuickMarcEditor.check008FieldLabels(testData.expected008BoxesSets);

      // #8 Delete one digit from "008" tag box
      QuickMarcEditor.updateExistingTagValue(testData.tag008RowIndex, testData.tag00);
      QuickMarcEditor.verifyTagValue(testData.tag008RowIndex, testData.tag00);
      QuickMarcEditor.checkContent('', testData.tag008RowIndex);
      QuickMarcEditor.checkDeleteButtonExist(testData.tag008RowIndex);

      // #9 Restore value in tag box with "008"
      QuickMarcEditor.updateExistingTagValue(testData.tag008RowIndex, testData.tag008);

      // #10 Click "Save & keep editing" button
      QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutMessage);
      QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
      QuickMarcEditor.check008FieldLabels(testData.expected008BoxesSets);

      // #11 Delete all characters from boxes of "008" field
      testData.expected008BoxesSets.forEach((box) => {
        QuickMarcEditor.updateValueOf008BoxByBoxName(box, '');
      });

      // #12 Click "Save & close" button
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.calloutMessage);

      // #13 - #14 Response from GET request to "/records-editor/records" contains "Date Ent" property for "008" field with value equal to current date ("yymmdd" format)
      cy.intercept('GET', '**records-editor/records?externalId=**').as('editMarc');
      MarcAuthority.edit();
      cy.wait('@editMarc').then((res) => {
        expect(res.response.body.fields[2].content['Date Ent']).to.be.eq(currentDate);
      });
    },
  );
});
