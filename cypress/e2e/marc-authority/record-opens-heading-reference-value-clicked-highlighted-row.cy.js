import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import Logs from '../../support/fragments/data_import/logs/logs';

describe('Importing MARC Authority files', () => {
  const testData = {};
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const fileName = 'oneMarcAuthority.mrc';
  const updatedFileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
  let createdAuthorityID;

  before('Creating data', () => {
    cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
      (createdUserProperties) => {
        testData.userProperties = createdUserProperties;
      },
    );
    cy.loginAsAdmin({
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    }).then(() => {
      DataImport.verifyUploadState();
      DataImport.uploadFileAndRetry(fileName, updatedFileName);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(updatedFileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(updatedFileName);
      Logs.getCreatedItemsID().then((link) => {
        createdAuthorityID = link.split('/')[5];
      });
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
    });
  });

  after('Deleting data', () => {
    cy.getAdminToken();
    if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID);
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C375089 View Authority Record: record opens in third pane when "Heading/Reference" value clicked for highlighted row (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      MarcAuthorities.searchBy('Keyword', 'Joseph');
      MarcAuthorities.selectFirst();
      MarcAuthorities.checkRecordDetailPageMarkedValue('Kowalewski, Joseph Étienne,');
    },
  );
});
