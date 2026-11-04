import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import { COMMON_BUTTON_LABELS } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Search', () => {
      describe('Filters', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();
          const naturalIdPrefix = `${getRandomLetters(15)}404447`;
          const sharedAccordionName = 'Shared';
          const sharedAuthority = {
            heading: `AT_C404447_MarcAuthority_Shared_${randomPostfix}`,
          };
          const localAuthority = {
            heading: `AT_C404447_MarcAuthority_Local_${randomPostfix}`,
          };
          const permissions = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];

          let user;
          let sharedAuthorityId;
          let localAuthorityId;
          let bothCheckedResults;

          // No search is executed in this test, so the result list is whatever the tenant has
          // (shared data) - only the presence/absence of the "Shared" icon in the rows and the
          // presence of the counters are checked, never their values. The records created
          // here only guarantee that both kinds of records exist
          const verifyFacetState = ({ isNoChecked, isYesChecked }) => {
            MarcAuthorities.verifySharedAccordionOpen(true);
            MarcAuthorities.verifyCheckboxInAccordion(
              sharedAccordionName,
              COMMON_BUTTON_LABELS.NO,
              isNoChecked,
            );
            MarcAuthorities.verifyCheckboxInAccordion(
              sharedAccordionName,
              COMMON_BUTTON_LABELS.YES,
              isYesChecked,
            );
            MarcAuthorities.verifyCountersShownInSharedFacet();
          };

          // The request sent on a facet click returns the first page of the result list; which
          // kinds of records (shared / local) it holds says which kinds the list must show
          // A fresh alias for every facet click, so cy.wait() can never pick up the response of
          // an earlier request
          let searchAliasCount = 0;
          const interceptFirstPageSearch = () => {
            searchAliasCount += 1;
            const alias = `searchAuthorities${searchAliasCount}`;
            cy.intercept('GET', '**/search/authorities?limit=**').as(alias);
            return alias;
          };
          const getKindsOfRecordsInSearchResponse = (alias) => {
            return cy.wait(`@${alias}`).then(({ response }) => {
              const { authorities } = response.body;
              return {
                hasShared: authorities.some(({ shared }) => shared),
                hasLocal: authorities.some(({ shared }) => !shared),
              };
            });
          };

          before('Create users, data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C404447_');
            cy.setTenant(Affiliations.College);
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C404447_');

            // Shared record - created directly in Central
            cy.resetTenant();
            MarcAuthorities.createMarcAuthorityViaAPI('', `${naturalIdPrefix}1`, [
              { tag: '100', content: `$a ${sharedAuthority.heading}`, indicators: ['1', '\\'] },
            ]).then((id) => {
              sharedAuthorityId = id;
            });

            // Local record - created in Member 1 (College) only
            cy.setTenant(Affiliations.College);
            MarcAuthorities.createMarcAuthorityViaAPI('', `${naturalIdPrefix}2`, [
              { tag: '100', content: `$a ${localAuthority.heading}`, indicators: ['1', '\\'] },
            ]).then((id) => {
              localAuthorityId = id;
            });

            // User created in Member 1 (College) - the tenant it works in - so its primary
            // affiliation is College and the login opens College directly, no affiliation switch
            // (ECS skill, Pattern 1). Central affiliation is added automatically
            cy.setTenant(Affiliations.College);
            cy.createTempUser(permissions).then((userProperties) => {
              user = userProperties;

              cy.login(user.username, user.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
          });

          after('Delete users, data', () => {
            cy.resetTenant();
            cy.getAdminToken(false);
            if (sharedAuthorityId) MarcAuthority.deleteViaAPI(sharedAuthorityId, true);
            // The user and the local record were created in College - deleted from there
            cy.setTenant(Affiliations.College);
            Users.deleteViaApi(user.userId);
            if (localAuthorityId) MarcAuthority.deleteViaAPI(localAuthorityId, true);
          });

          it(
            'C404447 Apply "Shared" facet to the search result list in "Member" tenant when search was Not executed (consortia) (promin)',
            { tags: ['extendedPathECS', 'promin', 'C404447'] },
            () => {
              // Step 1: expand "Shared" - both checkboxes unchecked, counters shown
              MarcAuthorities.verifyExistanceOfSharedAccordion();
              MarcAuthorities.verifySharedAccordionOpen(false);
              MarcAuthorities.clickAccordionByName(sharedAccordionName);
              verifyFacetState({ isNoChecked: false, isYesChecked: false });

              // Step 2: check "No" - local records only (no "Shared" icon)
              const noOnlyAlias = interceptFirstPageSearch();
              MarcAuthorities.actionsSelectCheckbox(COMMON_BUTTON_LABELS.NO);
              getKindsOfRecordsInSearchResponse(noOnlyAlias).then((results) => {
                expect(results).to.deep.equal({ hasShared: false, hasLocal: true });
                MarcAuthorities.verifyResultRowsSharedIconPresence(results);
              });
              verifyFacetState({ isNoChecked: true, isYesChecked: false });

              // Step 3: uncheck "No" - no records displayed
              MarcAuthorities.actionsSelectCheckbox(COMMON_BUTTON_LABELS.NO);
              MarcAuthorities.checkRecordsResultListIsAbsent();
              verifyFacetState({ isNoChecked: false, isYesChecked: false });

              // Step 4: check "Yes" - shared records only ("Shared" icon in every row). The case
              // text lists "No" as checked here, which is a leftover - it was unchecked in Step 3
              const yesOnlyAlias = interceptFirstPageSearch();
              MarcAuthorities.actionsSelectCheckbox(COMMON_BUTTON_LABELS.YES);
              getKindsOfRecordsInSearchResponse(yesOnlyAlias).then((results) => {
                expect(results).to.deep.equal({ hasShared: true, hasLocal: false });
                MarcAuthorities.verifyResultRowsSharedIconPresence(results);
              });
              verifyFacetState({ isNoChecked: false, isYesChecked: true });

              // Step 5: uncheck "Yes" - no records displayed
              MarcAuthorities.actionsSelectCheckbox(COMMON_BUTTON_LABELS.YES);
              MarcAuthorities.checkRecordsResultListIsAbsent();
              verifyFacetState({ isNoChecked: false, isYesChecked: false });

              // Step 6: check both - the kinds of records in the response are the kinds shown in the list
              const noFirstAlias = interceptFirstPageSearch();
              MarcAuthorities.actionsSelectCheckbox(COMMON_BUTTON_LABELS.NO);
              cy.wait(`@${noFirstAlias}`);
              const bothAlias = interceptFirstPageSearch();
              MarcAuthorities.actionsSelectCheckbox(COMMON_BUTTON_LABELS.YES);
              getKindsOfRecordsInSearchResponse(bothAlias).then((results) => {
                bothCheckedResults = results;
                MarcAuthorities.verifyResultRowsSharedIconPresence(results);
              });
              verifyFacetState({ isNoChecked: true, isYesChecked: true });

              // Step 7: collapse "Shared" - the result list is not changed
              MarcAuthorities.clickAccordionByName(sharedAccordionName);
              MarcAuthorities.verifySharedAccordionOpen(false);
              cy.then(() => MarcAuthorities.verifyResultRowsSharedIconPresence(bothCheckedResults));

              // Step 8: cancel the applied facet with the "x" icon - no records displayed
              MarcAuthorities.clickClearIconInSharedFacet();
              MarcAuthorities.checkRecordsResultListIsAbsent();

              // Step 9: expand "Shared" - both checkboxes unchecked, counters shown
              MarcAuthorities.expandSharedAccordionIfCollapsed();
              verifyFacetState({ isNoChecked: false, isYesChecked: false });

              // Step 10: switch to "Browse"
              MarcAuthorities.switchToBrowse();
              MarcAuthorities.verifyBrowseTabIsOpened();
              cy.wait(3000);

              // Step 11: "Shared" in Browse - both checkboxes unchecked, counters shown
              MarcAuthorities.expandSharedAccordionIfCollapsed();
              verifyFacetState({ isNoChecked: false, isYesChecked: false });
            },
          );
        });
      });
    });
  });
});
