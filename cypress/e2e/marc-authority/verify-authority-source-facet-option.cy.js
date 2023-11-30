import getRandomPostfix from '../../support/utils/stringTools';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorityBrowse from '../../support/fragments/marcAuthority/MarcAuthorityBrowse';

const testData = {};
const jobProfileToRun = 'Default - Create SRS MARC Authority';
const fileName = 'marFileForC365630.mrc';
const updatedFileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
const authoritySource = 'LC Subject Headings (LCSH)';
let createdAuthorityID;

describe('Importing MARC Authority files', () => {
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
    'C365630 Browse | Verify that the "Authority source" facet option will display the name of facet option when zero results are returned (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.switchToBrowse();
      MarcAuthorities.chooseAuthoritySourceOption(authoritySource);
      MarcAuthorityBrowse.searchBy('Name-title', 'Not-existing query');
      MarcAuthorityBrowse.getNotExistingHeadingReferenceValue('Not-existing query');
      MarcAuthorities.verifySelectedTextOfAuthoritySource(authoritySource);
    },
  );
});
