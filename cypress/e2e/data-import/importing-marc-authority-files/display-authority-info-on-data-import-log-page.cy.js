import {
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const filePath = 'marcAuthFileForC407009.mrc';
    const uploadedFileName = `C407009 autotestFile${getRandomPostfix()}.mrc`;
    // Title comes from the 100 $a heading in the fixture file
    const authorityTitle = 'AT_C407009_MarcAuthority';
    let testUser;

    before('Create user and login', () => {
      cy.getAdminToken().then(() => {
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407009_');
      });
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ]).then((userProperties) => {
        testUser = userProperties;
        cy.login(testUser.username, testUser.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testUser.userId);
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407009_');
    });

    it(
      'C407009 Display "Authority" information on "Data import" log page when import successful (promin)',
      { tags: ['extendedPath', 'promin', 'C407009'] },
      () => {
        // Step 1-3: Upload MARC Authority file and run with Default - Create SRS MARC Authority
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePath, uploadedFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY);
        JobProfiles.runImportFile();

        // Step 3: Wait for import completion, verify COMPLETED status
        Logs.waitFileIsImported(uploadedFileName);
        Logs.checkJobStatus(uploadedFileName, JOB_STATUS_NAMES.COMPLETED);

        // Step 4: Click filename; verify SRS MARC = Created, Authority = Created
        Logs.openFileDetails(uploadedFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.CREATED,
          FileDetails.columnNameInResultList.authority,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.BLANK,
          FileDetails.columnNameInResultList.holdings,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.BLANK,
          FileDetails.columnNameInResultList.item,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.BLANK,
          FileDetails.columnNameInResultList.order,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.BLANK,
          FileDetails.columnNameInResultList.invoice,
        );
        FileDetails.checkStatusInColumn('', FileDetails.columnNameInResultList.error);

        // Step 5: Check summary table — SRS MARC and Authority Created counters = 1
        FileDetails.checkSrsRecordQuantityInSummaryTable('1');
        FileDetails.checkAuthorityQuantityInSummaryTable('1');
        FileDetails.checkInstanceQuantityInSummaryTable();
        FileDetails.checkHoldingsQuantityInSummaryTable();
        FileDetails.checkItemQuantityInSummaryTable();
        FileDetails.checkOrderQuantityInSummaryTable();
        FileDetails.checkInvoiceInSummaryTable();
        FileDetails.checkErrorQuantityInSummaryTable();

        // Step 6: Click record title; JSON screen opens with Incoming record tab by default
        FileDetails.openJsonScreen(authorityTitle);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyIncomingRecordTabIsActive();
        JsonScreenView.verifyContentInTab(`"a": "${authorityTitle}"`);

        // Step 7: Click Authority tab; JSON response displayed, no "No record" message
        JsonScreenView.openAuthorityTab();
        JsonScreenView.verifyContentInTab(`"personalName": "${authorityTitle}"`);
        JsonScreenView.verifyContentNotExistInTab('No record');

        // Step 8: Click SRS MARC tab; JSON response displayed, no "No record" message
        JsonScreenView.openMarcSrsTab();
        JsonScreenView.verifyContentInTab(`"a": "${authorityTitle}"`);
        JsonScreenView.verifyContentNotExistInTab('No record');

        // Step 9: Close tab (navigate back to file details list)
        cy.go(-1);

        // Step 10: Click Created at Authority column; MARC Authority record opens in third pane
        FileDetails.openAuthority(RECORD_STATUSES.CREATED);
        MarcAuthority.waitLoading();
        MarcAuthority.contains(`$a ${authorityTitle}`);
      },
    );
  });
});
