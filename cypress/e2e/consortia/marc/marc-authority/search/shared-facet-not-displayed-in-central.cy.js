import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const randomPostfix = getRandomPostfix();
      const searchValue = `AT_C404408_MarcAuthority_${randomPostfix}`;
      const naturalIdPrefix = `${getRandomLetters(15)}404408`;
      const sharedAuthority = {
        heading: `${searchValue}_Shared`,
      };
      const localAuthority = {
        heading: `${searchValue}_Local`,
      };

      const permissions = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];

      let user;
      let sharedAuthorityId;
      let localAuthorityId;

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C404408_');

        // Shared record - created directly in Central
        cy.resetTenant();
        MarcAuthorities.createMarcAuthorityViaAPI('', `${naturalIdPrefix}1`, [
          { tag: '100', content: `$a ${sharedAuthority.heading}`, indicators: ['1', '\\'] },
        ]).then((id) => {
          sharedAuthorityId = id;
        });

        // Local record - created in a Member tenant only
        cy.setTenant(Affiliations.College);
        MarcAuthorities.createMarcAuthorityViaAPI('', `${naturalIdPrefix}2`, [
          { tag: '100', content: `$a ${localAuthority.heading}`, indicators: ['1', '\\'] },
        ]).then((id) => {
          localAuthorityId = id;
        });

        cy.resetTenant();
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

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        Users.deleteViaApi(user.userId);
        if (sharedAuthorityId) MarcAuthority.deleteViaAPI(sharedAuthorityId, true);
        cy.setTenant(Affiliations.College);
        if (localAuthorityId) MarcAuthority.deleteViaAPI(localAuthorityId, true);
      });

      it(
        'C404408 Verify that "Shared" facet is not displayed in "Central" tenant (consortia) (promin)',
        { tags: ['extendedPathECS', 'promin', 'C404408'] },
        () => {
          // Step 1: "Search & filter" pane - no "Shared" accordion before searching
          MarcAuthorities.verifyAbsenceOfSharedAccordion();

          // Step 2: Run a search - records show, still no "Shared" accordion, "Shared" icon shown
          MarcAuthorities.searchBy(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD, searchValue);
          MarcAuthorities.verifyResultsRowContent(sharedAuthority.heading);
          MarcAuthorities.verifyAbsenceOfSharedAccordion();
          MarcAuthorities.verifyResultRowContentSharedIcon(sharedAuthority.heading, true);

          // Step 3: Switch to "Browse" - search box and results are cleared
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.checkSearchInputIsEmpty();

          // Step 4: "Search & filter" pane - no "Shared" accordion in Browse mode either
          MarcAuthorities.verifyAbsenceOfSharedAccordion();

          // Step 5: Run a browse search - records show, still no "Shared" accordion, icon shown
          MarcAuthorityBrowse.searchBy(
            MarcAuthorityBrowse.searchOptions.personalName.option,
            sharedAuthority.heading,
          );
          MarcAuthorities.verifyResultsRowContent(sharedAuthority.heading);
          MarcAuthorities.verifyAbsenceOfSharedAccordion();
          MarcAuthorities.verifyResultRowContentSharedIcon(sharedAuthority.heading, true);
        },
      );
    });
  });
});
