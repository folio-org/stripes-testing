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
  const testData = {};
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const fileName = 'marcFileForC365632.mrc';
  const updatedFileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
  const headingType = 'Geographic Name';
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
    'C365632 Browse | Verify that the "Type of heading" facet option will display the name of facet option when zero results are returned (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.switchToBrowse();
      MarcAuthorities.chooseTypeOfHeading([headingType]);
      MarcAuthorityBrowse.searchBy('Name-title', 'Not-existing query');
      MarcAuthorityBrowse.getNotExistingHeadingReferenceValue('Not-existing query');
      MarcAuthorities.verifySelectedTextOfHeadingType(headingType);
    },
  );
});
