import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import DateTools from '../../../../../support/utils/dateTools';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const randomPostfix = getRandomPostfix();
      const authorityHeading = `AT_C423592_MarcAuthority_${randomPostfix}`;
      const today = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const notSpecifiedOption = 'Not specified';
      const naturalId = `423592${randomNDigitNumber(15)}`;

      const permissions = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];

      let user;
      let authorityId;

      before('Create user, data', () => {
        cy.getAdminToken();

        // Shared record - created directly in Central
        cy.resetTenant();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C423592_');
        MarcAuthorities.createMarcAuthorityViaAPI('', naturalId, [
          { tag: '100', content: `$a ${authorityHeading}`, indicators: ['1', '\\'] },
        ]).then((id) => {
          authorityId = id;
        });

        cy.createTempUser(permissions).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, permissions);

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        Users.deleteViaApi(user.userId);
        if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);
      });

      it(
        'C423592 Verify that search and browse queries in "MARC authority" app reset when switching affiliation (consortia) (promin)',
        { tags: ['extendedPathECS', 'promin', 'C423592'] },
        () => {
          // Step 1: Set a "Date created" filter and search for the record - Central tenant
          MarcAuthoritiesSearch.filterByDateCreated(today, today);
          MarcAuthorities.searchBy(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD, authorityHeading);
          MarcAuthorities.verifyResultsRowContent(authorityHeading);

          // Step 2: Switch affiliation to Member tenant - Search state resets
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          MarcAuthorities.waitLoading();
          MarcAuthorities.checkSearchInputIsEmpty();
          MarcAuthorities.verifySearchResultTabletIsAbsent(true);
          MarcAuthorities.checkSearchOption('keyword');
          MarcAuthoritiesSearch.verifyDateCreatedAccordionCollapsed();
          MarcAuthoritiesSearch.verifyDateCreatedFilterIsCleared();

          // Step 3: Switch to "Browse" - clean slate
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.checkDefaultBrowseOptions();

          // Step 4: Run a browse query with an "Authority source" filter - Member tenant
          MarcAuthorityBrowse.searchBy(
            MarcAuthorityBrowse.searchOptions.personalName.option,
            authorityHeading,
          );
          MarcAuthorities.chooseAuthoritySourceOption(notSpecifiedOption);
          MarcAuthorities.verifyResultsRowContent(authorityHeading);

          // Step 5: Switch affiliation back to Central - "Search" tab is reselected
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          MarcAuthorities.waitLoading();
          MarcAuthorities.verifySearchTabIsOpened();

          // Step 6: Click "Browse" tab - clean slate, no filter facets set
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.checkDefaultBrowseOptions();
        },
      );
    });
  });
});
