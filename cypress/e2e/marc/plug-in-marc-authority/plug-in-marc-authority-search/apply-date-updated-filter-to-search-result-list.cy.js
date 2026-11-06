import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag008: '008',
        tag100: '100',
        tag245: '245',
        tag700: '700',
        bibTitle: `AT_C359204_MarcBibInstance_${randomPostfix}`,
        authorityHeading: `AT_C359204_MarcAuthority_${randomPostfix}`,
      };
      const authData = {
        prefix: getRandomLetters(15),
        startsWithNumber: 1,
      };
      // Filter days are UTC days (the UI and the backend use the same range, UTC on test envs)
      const DAY_MS = 24 * 60 * 60 * 1000;
      const formatUtcDate = (timestamp) => new Date(timestamp).toISOString().split('T')[0];
      const todayText = formatUtcDate(Date.now());
      const yesterdayText = formatUtcDate(Date.now() - DAY_MS);
      const tomorrowText = formatUtcDate(Date.now() + DAY_MS);

      let user;
      let createdAuthorityId;
      let createdInstanceId;
      // A fresh alias for every request so cy.wait() never picks up an earlier response
      let searchAliasCount = 0;
      const interceptSearch = () => {
        searchAliasCount += 1;
        const alias = `searchAuthorities${searchAliasCount}`;
        cy.intercept('GET', '**/search/authorities?limit=**').as(alias);
        return alias;
      };

      // Bounds are taken from the request itself, not recomputed from "today", so the tenant
      // timezone decides which day a record was updated at
      const getUpdatedDateBounds = (requestUrl) => {
        const query = decodeURIComponent(new URL(requestUrl).searchParams.get('query') || '');
        const lower = query.match(/metadata\.updatedDate\s*>=?\s*"?([^"\s)]+)"?/);
        const upper = query.match(/metadata\.updatedDate\s*<=?\s*"?([^"\s)]+)"?/);
        expect(query, 'search query').to.include('metadata.updatedDate');
        expect(lower, 'lower "updatedDate" bound in the query').to.not.equal(null);
        expect(upper, 'upper "updatedDate" bound in the query').to.not.equal(null);
        // a bound without time covers the whole day
        const toMs = (bound, isUpper) => (bound.length === 10
          ? Date.parse(`${bound}T${isUpper ? '23:59:59.999' : '00:00:00.000'}Z`)
          : Date.parse(bound));
        return { lowerMs: toMs(lower[1], false), upperMs: toMs(upper[1], true) };
      };

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C359204_');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              `${authData.startsWithNumber}`,
              [
                {
                  tag: testData.tag100,
                  content: `$a ${testData.authorityHeading}`,
                  indicators: ['1', '\\'],
                },
              ],
            ).then((createdRecordId) => {
              createdAuthorityId = createdRecordId;
            });

            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
              { tag: testData.tag008, content: QuickMarcEditor.defaultValid008Values },
              {
                tag: testData.tag245,
                content: `$a ${testData.bibTitle}`,
                indicators: ['1', '1'],
              },
              {
                tag: testData.tag700,
                content: `$a AT_C359204_Contributor_${randomPostfix}`,
                indicators: ['1', '\\'],
              },
            ]).then((instanceId) => {
              createdInstanceId = instanceId;
            });
          }).then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag700);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            MarcAuthorities.verifySearchTabIsOpened();
          });
        });
      });

      after('Delete user and test data', () => {
        cy.getAdminToken(false);
        Users.deleteViaApi(user.userId);
        if (createdInstanceId) InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
      });

      it(
        'C359204 MARC Authority plug-in | Apply "Date updated" filter to the search result list (promin)',
        { tags: ['extendedPath', 'promin', 'C359204'] },
        () => {
          // Step 1: expand "Date updated" - "From", "To" and "Apply" are shown
          MarcAuthoritiesSearch.expandDateUpdatedAccordionInPlugin();

          // Step 2: fill both dates with the current date
          MarcAuthoritiesSearch.fillDateUpdatedInPlugin(todayText, todayText);

          // Step 3: apply - list holds records updated today; no query is entered so the list is
          // shared data updated today; verify bounds from the request and check up to 5 returned
          // records have updatedDate within those bounds
          const todayAlias = interceptSearch();
          MarcAuthoritiesSearch.applyDateUpdatedInPlugin();
          cy.wait(`@${todayAlias}`).then(({ request, response }) => {
            const { lowerMs, upperMs } = getUpdatedDateBounds(request.url);
            const returnedIds = response.body.authorities.map(({ id }) => id);

            expect(returnedIds.length, 'records updated today').to.be.greaterThan(0);
            cy.getAdminToken(false);
            [...new Set(returnedIds)].slice(0, 5).forEach((id) => {
              cy.okapiRequest({
                path: `authority-storage/authorities/${id}`,
                isDefaultSearchParamsRequired: false,
              }).then(({ body }) => {
                const updatedMs = Date.parse(body.metadata.updatedDate);
                expect(updatedMs, `"updatedDate" of ${id}`).to.be.within(lowerMs, upperMs);
              });
            });
          });

          // Steps 4-5: search by the heading of the own record - it is shown
          MarcAuthorities.searchByParameter('Keyword', testData.authorityHeading);
          MarcAuthorities.verifyRecordFound(testData.authorityHeading);

          // Steps 6-7: the day before - the record is not shown
          MarcAuthoritiesSearch.fillDateUpdatedInPlugin(yesterdayText, yesterdayText);
          MarcAuthoritiesSearch.applyDateUpdatedInPlugin();
          MarcAuthorities.verifyRecordFound(testData.authorityHeading, false);
          MarcAuthorities.verifyEmptySearchResults(testData.authorityHeading);

          // Steps 8-9: the day after - no records
          MarcAuthoritiesSearch.fillDateUpdatedInPlugin(tomorrowText, tomorrowText);
          MarcAuthoritiesSearch.applyDateUpdatedInPlugin();
          MarcAuthorities.verifyEmptySearchResults(testData.authorityHeading);
        },
      );
    });
  });
});
