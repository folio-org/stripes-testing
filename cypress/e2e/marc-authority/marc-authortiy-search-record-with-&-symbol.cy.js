import Permissions from '../../support/dictionary/permissions';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorityBrowse from '../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Importing MARC Authority files', () => {
  let user;
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
  let createdAuthorityID;

  before('Creating data', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
      DataImport.verifyUploadState();
      DataImport.uploadFileAndRetry('uniform_title.mrc', fileName);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      Logs.getCreatedItemsID().then((link) => {
        createdAuthorityID = link.split('/')[5];
      });
    });
    cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      },
    );
  });

  after('Deleting data', () => {
    MarcAuthority.deleteViaAPI(createdAuthorityID);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C350767 Browse for MARC Authority record with " & " symbol in the title (spitfire) (TaaS)',
    { tags: ['smoke', 'spitfire'] },
    () => {
      MarcAuthorities.switchToBrowse();
      MarcAuthorityBrowse.checkSearchOptions();
      MarcAuthorityBrowse.searchBy('Uniform title', 'Cartoons & Comics');
      MarcAuthorities.checkCellValueIsExists(0, 2, 'Cartoons & Comics');
      MarcAuthorities.checkHeadingReferenceColumnValueIsBold(0);
    },
  );
});
