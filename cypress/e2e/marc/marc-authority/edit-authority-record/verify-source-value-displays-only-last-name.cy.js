import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../../support/utils/stringTools';

const testData = {
  authority: {
    searchInput: 'Kirby, Jack',
    searchOption: 'Keyword',
  },
  calloutMessage:
    'This record has successfully saved and is in process. Changes may not appear immediately.',
  marcFile: {
    marc: 'marcAuthC356848.mrc',
    fileName: `testMarcFile.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    numOfRecords: 1,
  },
  createdAuthorityIDs: [],
  userProperties: {},
  firstUser: {},
};

describe('MARC', () => {
  describe('MARC Authority', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.dataImportUploadAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ])
        .then((createdUserProperties) => {
          testData.firstUser = createdUserProperties;
        })
        .then(() => {
          cy.getUsers({ limit: 1, query: `username=${testData.firstUser.username}` }).then(
            (users) => {
              cy.updateUser({
                ...users[0],
                personal: { ...users[0].personal, firstName: null },
              });
              cy.getUsers({ limit: 1, query: `username=${testData.firstUser.username}` }).then(
                (usrs) => {
                  testData.firstUser.firstName = usrs[0].personal.firstName;
                },
              );
            },
          );
          cy.login(testData.firstUser.username, testData.firstUser.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
            authRefresh: true,
          }).then(() => {
            DataImport.verifyUploadState();
            DataImport.uploadFile(testData.marcFile.marc, testData.marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(testData.marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            Logs.waitFileIsImported(testData.marcFile.fileName);
            Logs.checkStatusOfJobProfile('Completed');
            Logs.openFileDetails(testData.marcFile.fileName);
            Logs.getCreatedItemsID(0).then((link) => {
              testData.createdAuthorityIDs.push(link.split('/')[5]);
            });
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
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      Users.deleteViaApi(testData.firstUser.userId);
      testData.createdAuthorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C356848 Verify that "Source" value displays only the Last name of user, which edited record, when First name of user is not populated (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C356848'] },
      () => {
        // Step 1: Fill in the input field at "Search & filter" pane with the search query
        MarcAuthorities.searchByParameter(
          testData.authority.searchOption,
          testData.authority.searchInput,
        );
        MarcAuthorities.checkAfterSearch('Authorized', testData.authority.searchInput);

        // Step 2,3: View any "MARC Authority" record by clicking on its title
        MarcAuthorities.selectItem(testData.authority.searchInput, false);

        // Step 4: Click on the "Actions" button and select the "Edit" option
        MarcAuthority.edit();
        QuickMarcEditor.waitLoading();
        // Step 5: Verify that "Source" value does not match with your user's name
        QuickMarcEditor.checkUserNameInHeader(
          testData.firstUser.firstName,
          testData.firstUser.lastName,
        );

        // Step 6: Edit $a subfield of any 1XX MARC tag
        QuickMarcEditor.updateExistingField('100', '$a New Content');

        // Step 7: Click on the "Save & close" button
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkCallout(testData.calloutMessage);
        MarcAuthority.waitLoading();

        // Step 8: Click on the "Actions" button and select the "Edit" option
        MarcAuthority.edit();
        QuickMarcEditor.waitLoading();

        // Step 9: Verify that "Source" value matches with your user's Last name
        QuickMarcEditor.checkUserNameInHeader(
          testData.userProperties.firstName,
          testData.userProperties.lastName,
        );
      },
    );
  });
});
