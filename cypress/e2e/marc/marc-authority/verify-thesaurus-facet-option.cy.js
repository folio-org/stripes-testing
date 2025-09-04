import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
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
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
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
          response.forEach((record) => {
            createdAuthorityID.push(record.authority.id);
          });
        })
        .then(() => {
          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
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
      { tags: ['extendedPath', 'spitfire', 'C365627'] },
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
