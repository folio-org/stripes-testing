import { MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const testData = {
        authorityHeading: `AT_C442840_MarcAuthority_${getRandomPostfix()}`,
        tag110: '110',
        searchQuery: 'C442840 abrahadabraautotest',
        accordionOption: 'Corporate Name',
      };

      const expectedPageTitle = (query) => (query ? `MARC authority - ${query} - Browse - FOLIO` : 'MARC authority - FOLIO');

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };

      const authorityFields = [
        {
          tag: testData.tag110,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
      ];

      let createdAuthorityId;

      before(() => {
        cy.getAdminToken();

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              authData.startWithNumber,
              authorityFields,
            ).then((createdRecordId) => {
              createdAuthorityId = createdRecordId;

              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
                authRefresh: true,
              });
              MarcAuthorities.switchToBrowse();
              MarcAuthorities.checkDefaultBrowseOptions();
              MarcAuthoritiesSearch.selectSearchOption(MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME);
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C442840 MARC authority | Use "Reset all" in "Advanced search" modal (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C442840'] },
        () => {
          MarcAuthoritiesSearch.fillSearchInput(testData.searchQuery);
          cy.title().should('eq', expectedPageTitle());

          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorityBrowse.waitLoading();
          cy.title().should('eq', expectedPageTitle(testData.searchQuery));

          MarcAuthorities.clickResetAndCheckBrowse(testData.searchQuery);
          cy.title().should('eq', expectedPageTitle());

          MarcAuthoritiesSearch.selectSearchOption(
            MARC_AUTHORITY_BROWSE_OPTIONS.CORPORATE_CONFERENCE_NAME,
          );
          MarcAuthoritiesSearch.verifySelectedSearchOption(
            MARC_AUTHORITY_BROWSE_OPTIONS.CORPORATE_CONFERENCE_NAME,
          );
          MarcAuthorities.chooseTypeOfHeading(testData.accordionOption);
          cy.title().should('eq', expectedPageTitle());

          MarcAuthoritiesSearch.fillSearchInput(testData.searchQuery);
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorityBrowse.waitLoading();
          cy.title().should('eq', expectedPageTitle(testData.searchQuery));

          Object.values(MARC_AUTHORITY_BROWSE_OPTIONS).forEach((option) => {
            MarcAuthorities.clickResetAndCheckBrowse(testData.searchQuery);
            cy.title().should('eq', expectedPageTitle());

            MarcAuthoritiesSearch.selectSearchOption(option);
            MarcAuthoritiesSearch.verifySelectedSearchOption(option);
            MarcAuthoritiesSearch.fillSearchInput(testData.searchQuery);
            MarcAuthoritiesSearch.clickSearchButton();
            MarcAuthorityBrowse.waitLoading();
            cy.title().should('eq', expectedPageTitle(testData.searchQuery));
          });
        },
      );
    });
  });
});
