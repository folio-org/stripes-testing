import { Permissions } from '../../support/dictionary';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Edit Authority record', () => {
  const testData = {
    authority: {
      searchInput: 'DiCaprio, Leonardo',
      searchOption: 'Keyword',
    },
    editedField: {
      tag: '035',
      content: 'edited 035',
    },
    fields010: [
      { rowIndex: 4, tag: '010', content: '$a n  94000330' },
      { rowIndex: 5, tag: '010', content: '$a n  94000339' },
    ],
  };
  const subfieldPrefix = '$a';
  const authorityPostfix = '?authRefType=Authorized&heading';
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const marcFiles = [
    {
      marc: 'marcAuthFileForC375127.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      numOfRecords: 1,
    },
  ];
  const createdAuthorityIDs = [];

  before('Upload files', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
      marcFiles.forEach((marcFile) => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFile.fileName);
        for (let i = 0; i < marcFile.numOfRecords; i++) {
          Logs.getCreatedItemsID(i).then((link) => {
            createdAuthorityIDs.push(link.split('/')[5]);
          });
        }
      });

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    createdAuthorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C375127 Unable to save imported "MARC authority" record with multiple "010" fields when editing (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.searchInput);
      MarcAuthorities.select(`${createdAuthorityIDs[0]}${authorityPostfix}`);
      testData.fields010.forEach((field) => {
        MarcAuthority.checkTagInRow(field.rowIndex, field.tag);
      });
      MarcAuthority.edit();
      testData.fields010.forEach((field) => {
        QuickMarcEditor.verifyTagValue(field.rowIndex, field.tag);
        QuickMarcEditor.checkContent(field.content, field.rowIndex);
      });
      MarcAuthority.changeField(
        testData.editedField.tag,
        `${subfieldPrefix} ${testData.editedField.content}`,
      );
      QuickMarcEditor.checkContent(`${subfieldPrefix} ${testData.editedField.content}`, 6);
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.verifyAndDismissMultiple010TagCallout();
    },
  );
});
