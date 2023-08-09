import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Users from '../../../support/fragments/users/users';

describe('ui-data-import', () => {
  let user;
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const fileName = `C359207autotestFile.${getRandomPostfix()}.mrc`;
  // eslint-disable-next-line
  const error = '{\"error\":\"A new MARC-Authority was not created because the incoming record already contained a 999ff$s or 999ff$i field\"}';

  before('login', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password,
          { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      });
  });

  after('delete user', () => {
    Users.deleteViaApi(user.userId);
  });

  it('C359207 Checking the import to Create MARC Authority records, when incoming records do and do not have 999 ff field (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      // upload the first .mrc file
      DataImport.uploadFile('marcAuthFileC359207.mrc', fileName);
      JobProfiles.searchJobProfileForImport(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed with errors');
      Logs.openFileDetails(fileName);
      cy.wrap([0, 6]).each((rowNumber) => {
        [FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority
        ].forEach(columnName => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName, rowNumber);
        });
      });
      cy.wrap([1, 2, 3, 4, 5, 7]).each((rowNumber) => {
        FileDetails.checkStatusInColumn(FileDetails.status.noAction, FileDetails.columnNameInResultList.srsMarc, rowNumber);
        FileDetails.checkStatusInColumn(FileDetails.status.error, FileDetails.columnNameInResultList.error, rowNumber);
      });
      FileDetails.checkSrsRecordQuantityInSummaryTable('2');
      FileDetails.checkAuthorityQuantityInSummaryTable('2');
      // check No action counter in the Summary table
      FileDetails.checkSrsRecordQuantityInSummaryTable('6', 2);
      FileDetails.verifyErrorMessage(error, 1);
    });
});
