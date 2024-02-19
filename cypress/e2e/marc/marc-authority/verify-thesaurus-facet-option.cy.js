import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {};
    const jobProfileToRun = 'Default - Create SRS MARC Authority';
    const fileName = '100_MARC_authority_records.mrc';
    const updatedFileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
    const thesaurusType = 'Library of Congress Subject Headings';
    const createdAuthorityID = [];

    before('Creating data', () => {
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;
        },
      );

      DataImport.uploadFileViaApi(fileName, updatedFileName, jobProfileToRun)
        .then((response) => {
          response.entries.forEach((record) => {
            createdAuthorityID.push(record.relatedAuthorityInfo.idList[0]);
          });
        })
        .then(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
    });

    after('Deleting data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdAuthorityID.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C365627 Search | Verify that the "Thesaurus" facet option will display the name of facet option when zero results are returned (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
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
});
