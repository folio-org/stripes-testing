import TopMenu from '../../support/fragments/topMenu';
import FileManager from '../../support/utils/fileManager';
import GetRandomPostfix from '../../support/utils/stringTools';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import DevTeams from '../../support/dictionary/devTeams';
import TestTypes from '../../support/dictionary/testTypes';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import SelectJobProfile from '../../support/fragments/data-export/selectJobProfile';

let user;

const validFile = `autoTestValidFile${GetRandomPostfix()}.cql`;

describe('data-export', () => {
  before('Create test data', () => {
    cy.createTempUser([Permissions.dataExportEnableApp.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.dataExportPath,
        waiter: DataExportLogs.waitLoading,
      });
      FileManager.createFile(
        `cypress/fixtures/${validFile}`,
        '(keyword all "*" or isbn="*" or hrid=="*" or id=="*") sortby title',
      );
    });
  });

  after('Delete test data', () => {
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${validFile}`);
  });

  it(
    'C396382 CQL: Verify filtering job profiles on the "Select job profile to run the export" pane (firebird) (Taas)',
    { tags: [DevTeams.firebird, TestTypes.extendedPath] },
    () => {
      const defaultAuthority = 'Default authority export job profile';
      const jobProfile = 'Job profile';
      const notExactName = 'Default authority job profile';

      ExportFileHelper.uploadFile(validFile);
      SelectJobProfile.verifySelectJobPane();
      SelectJobProfile.verifyExistingJobProfiles();
      SelectJobProfile.verifySearchBox();
      SelectJobProfile.verifySearchButton(true);
      SelectJobProfile.searchForAJobProfile(defaultAuthority);
      SelectJobProfile.verifySearchResult(defaultAuthority);
      SelectJobProfile.pressBackspaceXTimes(defaultAuthority.slice('Default'.length).length);
      SelectJobProfile.verifySearchResult('Default');
      SelectJobProfile.clearSearchField();
      SelectJobProfile.verifyClearedSearchBox();
      SelectJobProfile.searchForAJobProfile(jobProfile);
      SelectJobProfile.verifySearchResult(jobProfile);
      SelectJobProfile.clearSearchField();
      SelectJobProfile.searchForAJobProfile(notExactName);
      SelectJobProfile.verifySearchResult(notExactName, true);
    },
  );
});
