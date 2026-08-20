import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let userId;
    const filePathForUpload = 'marcBibFileForC468161.mrc';
    const marcFileName = `C468161 autotestFile${getRandomPostfix()}.mrc`;
    const jobProfileName = 'Default - Create instance and SRS MARC Bib';

    before('Login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        userId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(userId);
      });
    });

    it(
      'C468161 User can view the job profile details when file is still uploading (promin)',
      { tags: ['extendedPath', 'promin', 'C468161'] },
      () => {
        // Step 1: Upload MARC Bib file
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, marcFileName, false);

        // Step 2: Open job profile details while file is still uploading
        JobProfiles.search(jobProfileName);
        JobProfiles.openJobProfileView(jobProfileName);

        JobProfiles.waitFileIsUploaded();
        JobProfiles.deleteUploadedFile(marcFileName);
        JobProfiles.confirmDeleteUploadedFile();
      },
    );
  });
});
