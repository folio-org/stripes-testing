import getRandomPostfix from '../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';

describe('Edit Authority record', () => {
  const testData = {
    authority: {
      title: 'DiCaprio, Leonardo',
      type: 'Authorized',
      searchInput: 'Di Caprio',
      searchOption: 'Keyword',
    },
    authority2: {
      searchInput: 'Canady, Robert Lynn',
      searchOption: 'Keyword',
    },
    editedTags: ['110', '111', '130', '150', '151', '155'],
    valuesFor010: ['n 94000330', 'n 94000331', 'n 94000339'],
  };

  const subfieldPrefix = '$a ';
  const authorityPostfix = '?authRefType=Authorized';
  const rowIndex1XX = 8;
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const marcFiles = [
    {
      marc: 'marcAuthFileForC375090.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC375099.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      numOfRecords: 1,
    },
  ];
  const createdAuthorityIDs = [];

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    }).then(() => {
      marcFiles.forEach((marcFile) => {
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(marcFile.marc, marcFile.fileName);
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
    });

    cy.createTempUser([
      Permissions.dataImportUploadAll.gui,
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

  after('Delete test data', () => {
    cy.getAdminToken();
    createdAuthorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C375090 No additional records appear after user edits "1XX" MARC tag in MARC authority record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchByParameter(
        testData.authority.searchOption,
        testData.authority.searchInput,
      );
      MarcAuthorities.verifyOnlyOneAuthorityRecordInResultsList();
      testData.editedTags.forEach((tag) => {
        MarcAuthorities.select(`${createdAuthorityIDs[0]}${authorityPostfix}`);
        MarcAuthority.edit();
        MarcAuthority.changeTag(rowIndex1XX, tag);
        QuickMarcEditor.verifyTagValue(rowIndex1XX, tag);
        MarcAuthority.clicksaveAndCloseButton();
        QuickMarcEditor.checkAfterSaveAndCloseAuthority();
        MarcAuthorities.checkAfterSearch(testData.authority.type, testData.authority.title);
        MarcAuthorities.verifyOnlyOneAuthorityRecordInResultsList();
      });
    },
  );

  it(
    'C375099 Unable to add multiple "010" fields to "MARC authority" record which is NOT linked to "MARC Bib" record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchByParameter(
        testData.authority2.searchOption,
        testData.authority2.searchInput,
      );
      MarcAuthorities.select(`${createdAuthorityIDs[1]}${authorityPostfix}`);
      MarcAuthority.edit();
      QuickMarcEditor.checkTagAbsent('010');
      QuickMarcEditor.addNewField('010', `${subfieldPrefix}${testData.valuesFor010[0]}`, 5);
      QuickMarcEditor.checkContent(`${subfieldPrefix}${testData.valuesFor010[0]}`, 6);
      QuickMarcEditor.addNewField('010', `${subfieldPrefix}${testData.valuesFor010[1]}`, 5);
      QuickMarcEditor.checkContent(`${subfieldPrefix}${testData.valuesFor010[1]}`, 6);
      QuickMarcEditor.clickSaveAndKeepEditingButton();
      QuickMarcEditor.verifyAndDismissMultiple010TagCallout();
      QuickMarcEditor.deleteField(6);
      QuickMarcEditor.verifyNoFieldWithContent(`${subfieldPrefix}${testData.valuesFor010[1]}`);
      QuickMarcEditor.clickSaveAndKeepEditing();
      QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
      cy.wait(1000);
      QuickMarcEditor.addNewField('010', `${subfieldPrefix}${testData.valuesFor010[2]}`, 5);
      QuickMarcEditor.checkContent(`${subfieldPrefix}${testData.valuesFor010[2]}`, 6);
      QuickMarcEditor.clickSaveAndKeepEditingButton();
      QuickMarcEditor.verifyAndDismissMultiple010TagCallout();
    },
  );
});
