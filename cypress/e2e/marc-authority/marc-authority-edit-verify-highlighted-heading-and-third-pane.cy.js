import getRandomPostfix from '../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';

describe('Edit Authority record', () => {
  const testData = {
    authority: {
      title: 'Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
      searchInput: 'Twain, Mark',
      searchOption: 'Name-title',
    },
    editedFields: [
      { tag: '100', content: 'edited 100' },
      { tag: '370', content: 'edited 370' },
    ],
  };
  const authorityPostfix = '?authRefType=Authorized&heading';
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const marcFiles = [
    {
      marc: 'marcAuthFileC350911.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    },
  ];
  let createdAuthorityID;

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.settingsDataImportEnabled.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
    });
  });

  before('Upload files', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    }).then(() => {
      DataImport.verifyUploadState();
      DataImport.uploadFile(marcFiles[0].marc, marcFiles[0].fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFiles[0].fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(marcFiles[0].fileName);
      Logs.getCreatedItemsID().then((link) => {
        createdAuthorityID = link.split('/')[5];
      });
    });
  });

  beforeEach('Visit MARC Authorities', () => {
    cy.visit(TopMenu.marcAuthorities);
    MarcAuthorities.waitLoading();
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    MarcAuthority.deleteViaAPI(createdAuthorityID);
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C350911 Results List: Display updated and highlighted Heading/reference value at browse result list after editing 1XX, 4XX, 5XX fields (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      MarcAuthorities.switchToBrowse();
      MarcAuthorities.searchByParameter(
        testData.authority.searchOption,
        testData.authority.searchInput,
      );
      MarcAuthorities.select(`${createdAuthorityID}${authorityPostfix}`);
      testData.editedFields.forEach(({ tag, content }) => {
        MarcAuthority.edit();
        MarcAuthority.changeField(tag, `$a ${content}`);
        MarcAuthority.clicksaveAndCloseButton();
        MarcAuthority.verifyHighlightedText(
          testData.editedFields[0].tag,
          testData.editedFields[0].content,
        );
        MarcAuthority.contains(content);
      });
    },
  );
});
