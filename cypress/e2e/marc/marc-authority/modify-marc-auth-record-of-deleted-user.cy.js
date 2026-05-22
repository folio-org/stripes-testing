import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
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
      marcValueC358994: 'C358994 Cartoons & Comics',
      valueForUpdateC358994: '$a C358994 Cartoons & Animations',
      valueAfterUpdateC358994: 'C358994 Cartoons & Animations',
      marcValueC358995: 'C358995 Cartoons & Books',
      valueForUpdateC358995: '$a C358995 Cartoons & Journals',
      valueAfterUpdateC358995: 'C358995 Cartoons & Journals',
      calloutMessage:
        'This record has successfully saved and is in process. Changes may not appear immediately.',
    };

    const user = {};

    const marcFiles = [
      {
        marc: 'marcAuthFileForC358994.mrc',
        fileName: `C358994testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      },
      {
        marc: 'marcAuthFileForC358995.mrc',
        fileName: `C358995testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      },
    ];

    const createdAuthorityIDs = [];

    before('Creating user', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.marcValueC358994);
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.valueAfterUpdateC358994);
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.marcValueC358995);
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.valueAfterUpdateC358995);

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ])
        .then((createdUserProperties) => {
          user.userAProperties = createdUserProperties;

          cy.getToken(user.userAProperties.username, user.userAProperties.password);
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].id);
              });
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
      createdAuthorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id, true);
      });
    });

    it(
      'C358994 Verify that user has access to "quickMARC" when user who imported "MARC authority" record has been deleted (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C358994'] },
      () => {
        cy.login(user.userBProperties.username, user.userBProperties.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
          authRefresh: true,
        });
        UsersSearchPane.searchByUsername(user.userAProperties.username);
        UsersSearchPane.openUser(user.userAProperties.username);
        Users.deleteUser();
        Users.successMessageAfterDeletion(
          `User ${user.userAProperties.username}, ${user.userCProperties.preferredFirstName} testMiddleName deleted successfully.`,
        );
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBy(testData.searchOption, testData.marcValueC358994);
        MarcAuthorities.selectTitle(testData.marcValueC358994);
        MarcAuthority.edit();
        QuickMarcEditor.updateExistingFieldContent(7, testData.valueForUpdateC358994);
        QuickMarcEditor.pressSaveAndCloseButton();
        QuickMarcEditor.checkCallout(testData.calloutMessage);
        MarcAuthorities.checkDetailViewIncludesText(testData.valueAfterUpdateC358994);
      },
    );

    it(
      'C358995 Verify that user has access to "quickMARC" when user who edited MARC record has been deleted (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C358995'] },
      () => {
        cy.login(user.userCProperties.username, user.userCProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
          authRefresh: true,
        });
        MarcAuthorities.searchBy(testData.searchOption, testData.marcValueC358995);
        MarcAuthorities.selectTitle(testData.marcValueC358995);
        MarcAuthority.edit();
        QuickMarcEditor.updateExistingFieldContent(7, testData.valueForUpdateC358995);
        QuickMarcEditor.pressSaveAndCloseButton();
        QuickMarcEditor.checkCallout(testData.calloutMessage);
        MarcAuthorities.checkRecordDetailPageMarkedValue(testData.valueAfterUpdateC358995);
        cy.login(user.userBProperties.username, user.userBProperties.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
          authRefresh: true,
        });
        UsersSearchPane.searchByUsername(user.userCProperties.username);
        UsersSearchPane.openUser(user.userCProperties.username);
        Users.deleteUser();
        Users.successMessageAfterDeletion(
          `User ${user.userCProperties.username}, ${user.userCProperties.preferredFirstName} testMiddleName deleted successfully.`,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.searchBy(testData.searchOption, testData.valueAfterUpdateC358995);
        MarcAuthorities.selectTitle(testData.valueAfterUpdateC358995);
        MarcAuthority.edit();
        QuickMarcEditor.updateExistingFieldContent(7, `$a ${testData.marcValueC358995}`);
        QuickMarcEditor.pressSaveAndCloseButton();
        QuickMarcEditor.checkCallout(testData.calloutMessage);
        MarcAuthorities.checkDetailViewIncludesText(testData.marcValueC358995);
      },
    );
  });
});
