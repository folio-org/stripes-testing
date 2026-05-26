import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Result list / sorting', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(15);

      const testData = {
        noResultQuery: `eprkpekrepC350606${getRandomLetters(10)}`,
        noResultsMessage: 'No results found for',
        authorityHeading: `AT_C350606_MarcAuthority_${randomPostfix}`,
        naturalId: `350606${randomDigits}`,
      };

      let userData;
      let createdAuthorityId;

      before('Create user and data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C350606_');

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        ]).then((userProperties) => {
          userData = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI('', testData.naturalId, [
            {
              tag: '100',
              content: `$a ${testData.authorityHeading}`,
              indicators: ['1', '\\'],
            },
          ]).then((id) => {
            createdAuthorityId = id;

            cy.login(userData.username, userData.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
      });

      after('Delete user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
      });

      it(
        'C350606 Check search results pane and "Actions" menu when no results are returned (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C350606'] },
        () => {
          // Steps 1-3: Select search option, enter a no-results query, click Search
          MarcAuthoritiesSearch.searchBy(
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            testData.noResultQuery,
          );

          // Step 3 expected: "No results found for..." message is displayed
          MarcAuthorities.verifyEmptySearchResults(testData.noResultQuery);

          // Step 4: Click "Actions" button
          MarcAuthorities.clickActionsButton();
          // Verify Actions menu contents
          MarcAuthorities.verifyActionsMenu({
            saveUuidsEnabled: false,
            saveCqlEnabled: false,
            newShown: true,
            exportEnabled: false,
          });
        },
      );
    });
  });
});
