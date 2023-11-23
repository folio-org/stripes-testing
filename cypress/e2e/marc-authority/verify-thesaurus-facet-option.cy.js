import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TestTypes from '../../support/dictionary/testTypes';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Importing MARC Authority files', () => {
  const testData = {};
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const fileName = '100_MARC_authority_records.mrc';
  const updatedFileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
  const thesaurusType = 'Library of Congress Subject Headings';
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
    'C365627 Search | Verify that the "Thesaurus" facet option will display the name of facet option when zero results are returned (spitfire) (TaaS)',
    { tags: ['extendedPath', DevTeams.spitfire] },
    () => {
      MarcAuthorities.verifyThesaurusAccordionAndClick();
      MarcAuthorities.chooseThesaurus(thesaurusType);
      MarcAuthorities.searchBy('Keyword', 'Not-existing query');
      MarcAuthorities.verifyThesaurusAccordionAndClick();
      MarcAuthorities.checkNoResultsMessage(
        'No results found for "Not-existing query". Please check your spelling and filters.',
      );
      MarcAuthorities.verifyThesaurusAccordionAndClick();
      MarcAuthorities.verifySelectedTextOfThesaurus(thesaurusType);
    },
  );
});
