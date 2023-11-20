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

describe('Importing MARC Authority files', () => {
  const testData = {};
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const fileName = '100_MARC_authority_records.mrc';
  const updatedFileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
  const trasureType = 'Library of Congress Subject Headings';
  let createdAuthorityID;

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.settingsDataImportEnabled.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
    });
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
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      MarcAuthorities.verifyThesaurusAccordionAndClick();
      MarcAuthorities.chooseThesaurus(trasureType);
      MarcAuthorities.searchBy('Keyword', 'Not-existing query');
      MarcAuthorities.verifyThesaurusAccordionAndClick();
      MarcAuthorities.checkNoResultsMessage(
        'No results found for "Not-existing query". Please check your spelling and filters.',
      );
      MarcAuthorities.verifyThesaurusAccordionAndClick();
      MarcAuthorities.verifySelectedTextOfThesaurus(trasureType);
    },
  );
});
