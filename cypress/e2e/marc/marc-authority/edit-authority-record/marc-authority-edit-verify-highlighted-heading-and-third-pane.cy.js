import getRandomPostfix from '../../../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('Edit Authority record', () => {
  const testData = {
    authority: {
      title: 'Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
      searchInput: 'Twain, Mark',
      searchOption: 'Name-title',
      searchOption2: 'Keyword',
    },
    authority2: {
      searchInput: 'Gulf Stream',
      searchOption: 'Geographic name',
    },
    authorityPostfixes: [
      {
        type: 'authorized',
        postfix: '?authRefType=Authorized',
      },
      {
        type: 'reference',
        postfix:
          '?authRefType=Reference&headingRef=Twain%2C%20Mark%2C%201835-1910.%20Huckleberry%20Finn',
      },
      {
        type: 'auth/ref',
        postfix: '?authRefType=Auth%2FRef&headingRef=Twain%2C%20Mark%2C%201835-1910',
      },
    ],
    editedFields: [
      { rowIndex: 14, tag: '100', content: 'Twain, Mark - edited 100' },
      { rowIndex: 27, tag: '400', content: 'Twain, Mark - edited 400' },
      { rowIndex: 29, tag: '500', content: 'Twain, Mark - edited 500' },
    ],
    editedGeographicNameField: {
      tag: '151',
      content: 'edited 151',
    },
  };

  const postfixC350909 = ' - C350909';
  const postfixC350911 = ' - C350911';
  const postfixC350946 = ' - C350946';
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const marcFiles = [
    {
      marc: 'marcAuthFileC350909.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      numOfRecords: 1,
    },
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
    'C350909 Results List: Display updated and highlighted Heading/reference value at search result list after editing 1XX, 4XX, 5XX fields (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      MarcAuthorities.switchToSearch();
      MarcAuthorities.searchByParameter(
        testData.authority.searchOption2,
        testData.authority.searchInput,
      );
      MarcAuthorities.clickActionsButton();
      MarcAuthorities.actionsSortBy('Authorized/Reference');
      MarcAuthorities.checkResultListSortedByColumn(1);
      cy.wait(3000);
      testData.editedFields.forEach(({ rowIndex, content }, index) => {
        MarcAuthorities.select(
          `${createdAuthorityIDs[0]}${testData.authorityPostfixes[index].postfix}`,
        );
        MarcAuthority.edit();
        QuickMarcEditor.updateExistingFieldContent(rowIndex, `$a ${content}${postfixC350909}`);
        MarcAuthority.clicksaveAndCloseButton();
        QuickMarcEditor.checkAfterSaveAndCloseAuthority();
        MarcAuthorities.checkRowUpdatedAndHighlighted(`${content}${postfixC350909}`);
      });
    },
  );

  it(
    'C350911 Results List: Display updated and highlighted Heading/reference value at browse result list after editing 1XX, 4XX, 5XX fields (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      MarcAuthorities.switchToBrowse();
      MarcAuthorities.searchByParameter(
        testData.authority.searchOption,
        testData.authority.searchInput,
      );
      testData.editedFields.forEach(({ rowIndex, content }, index) => {
        if (index < 2) {
          MarcAuthorities.select(
            `${createdAuthorityIDs[1]}${testData.authorityPostfixes[index].postfix}`,
          );
          MarcAuthority.edit();
          QuickMarcEditor.updateExistingFieldContent(rowIndex, `$a ${content}${postfixC350911}`);
          MarcAuthority.clicksaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthorities.checkRowUpdatedAndHighlighted(`${content}${postfixC350911}`);
        }
      });
    },
  );

  it(
    'C350946 Verify that third pane still opened after editing first search result (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      MarcAuthorities.switchToSearch();
      MarcAuthorities.searchByParameter(
        testData.authority.searchOption2,
        testData.authority.searchInput,
      );
      MarcAuthorities.select(`${createdAuthorityIDs[0]}${testData.authorityPostfixes[0].postfix}`);
      MarcAuthority.edit();
      MarcAuthority.changeField(
        testData.editedFields[0].tag,
        `$a ${testData.editedFields[0].content}${postfixC350946}`,
      );
      MarcAuthority.clicksaveAndCloseButton();
      MarcAuthority.contains(`${testData.editedFields[0].content}${postfixC350946}`);
      MarcAuthorities.switchToBrowse();
      MarcAuthorities.searchByParameter(
        testData.authority2.searchOption,
        testData.authority2.searchInput,
      );
      MarcAuthorities.select(`${createdAuthorityIDs[3]}${testData.authorityPostfixes[0].postfix}`);
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
