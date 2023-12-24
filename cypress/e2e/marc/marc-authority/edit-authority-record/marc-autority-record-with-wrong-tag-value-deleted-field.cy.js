import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC -> MARC Authority -> Edit Authority record', () => {
  const testData = {
    authority: {
      searchOption: 'Keyword',
      title: 'Beethoven, Ludwig van (no 010)',
    },
    field010: { tag: '010', subfield1: '$a n90635366', subfield2: '$a n90635377' },
  };
  const authorityPostfix = '?authRefType=Authorized';
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const marcFiles = [
    {
      marc: 'marcAuthFileForC375166.mrc',
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
        JobProfiles.waitFileIsUploaded();
        JobProfiles.waitLoadingList();
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
    createdAuthorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C375166 Save "MARC authority" record with wrong tag value and deleted field (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
      MarcAuthorities.select(`${createdAuthorityIDs[0]}${authorityPostfix}`);
      MarcAuthority.edit();
      MarcAuthority.changeTag(5, '0');
      QuickMarcEditor.verifyTagValue(5, '0');
      QuickMarcEditor.checkButtonSaveAndCloseEnable();

      MarcAuthority.deleteTag(7);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.verifyMarcTagThreeCharacterCallout();

      MarcAuthority.changeTag(5, '040');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.verifyConfirmModal();
    },
  );
});
