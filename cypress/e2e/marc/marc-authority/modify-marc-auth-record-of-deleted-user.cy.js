import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      searchOption: 'Keyword',
      marcValue: 'Cartoons & Comics',
      valueForUpdate: '$a Cartoons & Animations',
      valueAfterUpdate: 'Cartoons & Animations',
      calloutMessage:
        'This record has successfully saved and is in process. Changes may not appear immediately.',
    };

    const user = {};

    const marcFiles = [
      {
        marc: 'marcAuthFileForC358994.mrc',
        fileName: `C358994testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
      },
    ];

    const createdAuthorityIDs = [];

    before('Creating user', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.marcValue);

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ])
        .then((createdUserProperties) => {
          user.userAProperties = createdUserProperties;

          marcFiles.forEach((marcFile) => {
            cy.login(user.userAProperties.username, user.userAProperties.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            }).then(() => {
              DataImport.verifyUploadState();
              DataImport.uploadFile(marcFile.marc, marcFile.fileName);
              JobProfiles.waitLoadingList();
              JobProfiles.search(marcFile.jobProfileToRun);
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
          });
        })
        .then(() => {
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiUsersCheckTransactions.gui,
            Permissions.uiUsersDelete.gui,
            Permissions.uiUserEdit.gui,
            Permissions.uiUsersView.gui,
          ]).then((createdUserProperties) => {
            user.userBProperties = createdUserProperties;
          });

          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ]).then((createdUserProperties) => {
            user.userCProperties = createdUserProperties;
          });
        });
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userBProperties.userId);
      MarcAuthority.deleteViaAPI(createdAuthorityIDs[0]);
    });

    it(
      'C358994 Verify that user has access to "quickMARC" when user who imported "MARC authority" record has been deleted (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C358994'] },
      () => {
        cy.login(user.userBProperties.username, user.userBProperties.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
        UsersSearchPane.searchByUsername(user.userAProperties.username);
        UsersSearchPane.openUser(user.userAProperties.username);
        Users.deleteUser();
        Users.successMessageAfterDeletion(
          `User ${user.userAProperties.username}, ${user.userCProperties.preferredFirstName} testMiddleName deleted successfully.`,
        );
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBy(testData.searchOption, testData.marcValue);
        MarcAuthorities.selectTitle(testData.marcValue);
        MarcAuthority.edit();
        QuickMarcEditor.updateExistingFieldContent(7, testData.valueForUpdate);
        QuickMarcEditor.saveAndCloseWithValidationWarnings();
        QuickMarcEditor.checkCallout(testData.calloutMessage);
        MarcAuthorities.checkDetailViewIncludesText(testData.valueAfterUpdate);
      },
    );

    it(
      'C358995 Verify that user has access to "quickMARC" when user who edited MARC record has been deleted (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C358995'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(user.userCProperties.username, user.userCProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
        MarcAuthorities.searchBy(testData.searchOption, testData.valueAfterUpdate);
        MarcAuthorities.selectTitle(testData.valueAfterUpdate);
        MarcAuthority.edit();
        QuickMarcEditor.updateExistingFieldContent(7, `$a ${testData.marcValue}`);
        QuickMarcEditor.saveAndCloseWithValidationWarnings();
        QuickMarcEditor.checkCallout(testData.calloutMessage);
        MarcAuthorities.checkRecordDetailPageMarkedValue(testData.marcValue);
        cy.waitForAuthRefresh(() => {
          cy.login(user.userBProperties.username, user.userBProperties.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
        UsersSearchPane.searchByUsername(user.userCProperties.username);
        UsersSearchPane.openUser(user.userCProperties.username);
        Users.deleteUser();
        Users.successMessageAfterDeletion(
          `User ${user.userCProperties.username}, ${user.userCProperties.preferredFirstName} testMiddleName deleted successfully.`,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBy(testData.searchOption, testData.marcValue);
        MarcAuthorities.selectTitle(testData.marcValue);
        MarcAuthority.edit();
        QuickMarcEditor.updateExistingFieldContent(7, testData.valueForUpdate);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkCallout(testData.calloutMessage);
        MarcAuthorities.checkDetailViewIncludesText(testData.valueAfterUpdate);
      },
    );
  });
});
