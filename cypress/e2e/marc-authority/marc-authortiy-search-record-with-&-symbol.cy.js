import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import Parallelization from '../../support/dictionary/parallelization';

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
    { tags: [TestTypes.smoke, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      MarcAuthorities.switchToBrowse();
      MarcAuthorityBrowse.checkSearchOptions();
      MarcAuthorityBrowse.searchBy('Uniform title', 'Cartoons & Comics');
      MarcAuthorities.checkCellValueIsExists(5, 2, 'Cartoons');
      MarcAuthorities.checkHeadingReferenceColumnValueIsBold(0);
    },
  );
});
