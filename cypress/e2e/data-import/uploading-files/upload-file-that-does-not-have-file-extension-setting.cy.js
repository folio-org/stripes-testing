import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';

describe('data-import', () => {
  describe('Uploading files', () => {
    let user;

    before('create test data', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2356 Upload a file that does not have a file extension SETTING (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const filePathWithNotExistingFileExtension = 'file.txt';
        const fileNameWithNotExistingFileExtension = `C2356 autotestFile.${getRandomPostfix()}.txt`;
        const filePathWithBlockedFileExtension = 'fileForC2356.mrk';
        const fileNameWithBlockedFileExtension = `C2356 autotestFile.${getRandomPostfix()}.mrk`;

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(
          filePathWithNotExistingFileExtension,
          fileNameWithNotExistingFileExtension,
        );
        JobProfiles.waitLoadingList();
        DataImport.verifyFileIsImported(fileNameWithNotExistingFileExtension);

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathWithBlockedFileExtension, fileNameWithBlockedFileExtension);
        DataImport.verifyImportBlockedModal();
      },
    );
  });
});
