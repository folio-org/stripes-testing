import {
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const testData = {
      searchPrefix: 'C877083',
      headingType: 'Personal Name',
      authorizedType: 'Authorized',
      browseOption: 'Name-title',
      authorityHeading: 'Twain \\ Mark, 1835 \\\\ 1910. Adventures\\ of \\Huckleberry Fi\\\\nn',
      tag100Content:
        '$a Twain \\ Mark, $d 1835 \\\\ 1910. $t Adventures\\ of \\Huckleberry Fi\\\\nn',
      tag670Content:
        '$a His\\ \\Tom \\\\ Sawyer \\ and Huck\\leberry Fi\\\\nn, 1979, c1980: $b t.p. (containing the complete texts of ... The adventures of Huckleberry Finn)',
      browseSearchQuery:
        'Twain \\\\ Mark, 1835 \\\\\\\\ 1910. Adventures\\\\ of \\\\Huckleberry Fi\\\\\\\\nn',
    };
    const marcFile = {
      marc: 'marcAuthFileForC877083.mrc',
      fileName: `C877083 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    };
    let createdAuthorityID;
    let user;

    before('Create test data and login', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(`${testData.searchPrefix}*`);

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID, true);
    });

    it(
      'C877083 Import MARC authority record with backslash character in some fields and check Authority detail view pane / browse pane (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C877083'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);

        Logs.openFileDetails(marcFile.fileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        Logs.getCreatedItemsID().then((link) => {
          createdAuthorityID = link.split('/')[5];
        });

        FileDetails.openAuthority(RECORD_STATUSES.CREATED);
        MarcAuthority.waitLoading();
        MarcAuthority.contains(testData.tag100Content);
        MarcAuthority.contains(testData.tag670Content);

        MarcAuthorities.switchToBrowse();
        MarcAuthorityBrowse.searchBy(testData.browseOption, testData.browseSearchQuery);
        MarcAuthorities.verifyResultsRowContent(
          testData.authorityHeading,
          testData.authorizedType,
          testData.headingType,
        );
      },
    );
  });
});
