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
    authority2: {
      searchInput: 'Gulf Stream',
      searchOption: 'Geographic name',
    },
    editedFields: [
      {
        tag: '100',
        content: 'Twain, Mark, 1835-1910. Adventures of Huckleberry Finn - edited',
        secondContent: 'Twain, Mark, 1835-1910. Adventures of Huckleberry Finn - edited twice',
      },
      { tag: '370', content: 'edited 370' },
    ],
    editedGeographicNameField: {
      tag: '151',
      content: 'edited 151',
    },
  };
  const authorityPostfix = '?authRefType=Authorized&heading';
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const marcFiles = [
    {
      marc: 'marcAuthFileC350911.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      numOfRecords: 1,
    },
    {
      marc: 'marcFileForC350946.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      numOfRecords: 2,
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

  after('Delete test data', () => {
    cy.getAdminToken();
    createdAuthorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
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
      MarcAuthorities.select(`${createdAuthorityIDs[0]}${authorityPostfix}`);
      testData.editedFields.forEach(({ tag, content }) => {
        MarcAuthority.edit();
        MarcAuthority.changeField(tag, `$a ${content}`);
        MarcAuthority.clicksaveAndCloseButton();
        MarcAuthorities.checkRecordDetailPageMarkedValue(testData.editedFields[0].content);
        MarcAuthority.contains(content);
      });
    },
  );

  it(
    'C350946 Verify that third pane still opened after editing first search result (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      MarcAuthorities.switchToSearch();
      MarcAuthorities.searchBeats('Twain');
      MarcAuthorities.select(`${createdAuthorityIDs[0]}${authorityPostfix}`);
      MarcAuthority.edit();
      MarcAuthority.changeField(
        testData.editedFields[0].tag,
        `$a ${testData.editedFields[0].secondContent}`,
      );
      MarcAuthority.clicksaveAndCloseButton();
      MarcAuthority.contains(testData.editedFields[0].secondContent);
      MarcAuthorities.switchToBrowse();
      MarcAuthorities.searchByParameter(
        testData.authority2.searchOption,
        testData.authority2.searchInput,
      );
      MarcAuthorities.select(`${createdAuthorityIDs[2]}${authorityPostfix}`);
      MarcAuthority.edit();
      MarcAuthority.changeField(
        testData.editedGeographicNameField.tag,
        `$a ${testData.editedGeographicNameField.content}`,
      );
      MarcAuthority.clicksaveAndCloseButton();
      MarcAuthority.contains(testData.editedGeographicNameField.content);
    },
  );
});
