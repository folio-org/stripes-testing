import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../support/utils/stringTools';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('MARC -> MARC Authority', () => {
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
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  const createdAuthorityIDs = [];

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
    ]).then((createdUserProperties) => {
      user.userAProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.login(user.userAProperties.username, user.userAProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        }).then(() => {
          DataImport.uploadFile(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
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
    });

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

  after('Deleting created user', () => {
    Users.deleteViaApi(user.userBProperties.userId);
    MarcAuthority.deleteViaAPI(createdAuthorityIDs[0]);
  });

  it(
    'C358994 Verify that user has access to "quickMARC" when user who imported "MARC authority" record has been deleted (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      cy.login(user.userBProperties.username, user.userBProperties.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
      UsersSearchPane.searchByUsername(user.userAProperties.username);
      UsersSearchPane.openUser(user.userAProperties.username);
      Users.deleteUser();
      Users.successMessageAfterDeletion(
        `User ${user.userAProperties.username}, testPermFirst testMiddleName deleted successfully.`,
      );

      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.searchBy(testData.searchOption, testData.marcValue);
      MarcAuthorities.selectTitle(testData.marcValue);
      MarcAuthority.edit();
      QuickMarcEditor.updateExistingFieldContent(7, testData.valueForUpdate);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.calloutMessage);
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.valueAfterUpdate);
    },
  );

  it(
    'C358995 Verify that user has access to "quickMARC" when user who edited MARC record has been deleted (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      cy.login(user.userCProperties.username, user.userCProperties.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
      MarcAuthorities.searchBy(testData.searchOption, testData.valueAfterUpdate);
      MarcAuthorities.selectTitle(testData.valueAfterUpdate);
      MarcAuthority.edit();
      QuickMarcEditor.updateExistingFieldContent(7, `$a ${testData.marcValue}`);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.calloutMessage);
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.marcValue);

      cy.login(user.userBProperties.username, user.userBProperties.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
      UsersSearchPane.searchByUsername(user.userCProperties.username);
      UsersSearchPane.openUser(user.userCProperties.username);
      Users.deleteUser();
      Users.successMessageAfterDeletion(
        `User ${user.userCProperties.username}, testPermFirst testMiddleName deleted successfully.`,
      );

      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.searchBy(testData.searchOption, testData.marcValue);
      MarcAuthorities.selectTitle(testData.marcValue);
      MarcAuthority.edit();
      QuickMarcEditor.updateExistingFieldContent(7, testData.valueForUpdate);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.calloutMessage);
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.valueAfterUpdate);
    },
  );
});
