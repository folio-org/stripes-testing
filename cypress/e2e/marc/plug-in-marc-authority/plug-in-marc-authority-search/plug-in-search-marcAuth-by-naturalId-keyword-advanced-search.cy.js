import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../support/constants';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(5);
      const randomLetters = getRandomLetters(10);
      const testData = {
        tag008: '008',
        tag010: '010',
        tag100: '100',
        tag245: '245',
        tag700: '700',
        authorityPrefix: `AT_C422177_MarcAuthority_${randomPostfix}`,
        bibTitle: `AT_C422177_MarcBibInstance_${randomPostfix}`,
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.ADVANCED_SEARCH,
        naturalIdPrefix: `auto${randomLetters}`,
        naturalIdBase: `422177${randomDigits}`,
      };

      const authorityHeadings = Array.from(
        { length: 3 },
        (_, i) => `${testData.authorityPrefix} ${i}`,
      );
      const naturalIdValues = [
        { prefix: testData.naturalIdPrefix, base: `  ${testData.naturalIdBase}001` },
        { prefix: testData.naturalIdPrefix, base: `${testData.naturalIdBase}002` },
        { prefix: testData.naturalIdPrefix, base: `\\\\${testData.naturalIdBase}003` },
      ];

      // Three authority records: some with spaces between prefix and identifier
      const authorityRecords = [
        {
          tag001Prefix: '',
          tag001Base: `${randomDigits}001`,
          fields: [
            {
              tag: testData.tag010,
              content: `$a ${naturalIdValues[0].prefix}${naturalIdValues[0].base}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: testData.tag100,
              content: `$a ${authorityHeadings[0]}`,
              indicators: ['\\', '\\'],
            },
          ],
        },
        {
          tag001Prefix: '',
          tag001Base: `${randomDigits}002`,
          fields: [
            {
              tag: testData.tag010,
              content: `$a ${naturalIdValues[1].prefix}${naturalIdValues[1].base}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: testData.tag100,
              content: `$a ${authorityHeadings[1]}`,
              indicators: ['\\', '\\'],
            },
          ],
        },
        {
          tag001Prefix: naturalIdValues[2].prefix,
          tag001Base: `${naturalIdValues[2].base}`,
          fields: [
            {
              tag: testData.tag100,
              content: `$a ${authorityHeadings[2]}`,
              indicators: ['\\', '\\'],
            },
          ],
        },
      ];

      // Advanced search query using "keyword containsAll" with naturalId values (some with spaces)
      const searchQuery = `keyword containsAll ${naturalIdValues[0].prefix}${naturalIdValues[0].base} or keyword containsAll ${naturalIdValues[1].prefix}${naturalIdValues[1].base} or keyword containsAll ${naturalIdValues[2].prefix}${naturalIdValues[2].base}`;

      const marcBibFields = [
        { tag: testData.tag008, content: QuickMarcEditor.defaultValid008Values },
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityPrefix}`,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.bibTitle}`,
          indicators: ['1', '1'],
        },
      ];

      const createdAuthorityIds = [];
      let createdBibId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422177');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            authorityRecords.forEach((record) => {
              MarcAuthorities.createMarcAuthorityViaAPI(
                record.tag001Prefix,
                record.tag001Base,
                record.fields,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });
            });

            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdBibId = instanceId;
              },
            );
          }).then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdBibId);
        createdAuthorityIds.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C422177 MARC Authority plug-in | Support search for "naturalId" field using "Advanced search" search option (Keyword search option) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C422177'] },
        () => {
          InventoryInstances.searchByTitle(createdBibId);
          InventoryInstances.selectInstanceById(createdBibId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthorities.verifyEnabledSearchButton();
          cy.intercept('GET', '/authority-source-files*').as('getAuthFiles');
          cy.intercept('GET', '/search/authorities/facets*').as('getFacets');
          MarcAuthorities.switchToSearch();
          cy.wait('@getAuthFiles').its('response.statusCode').should('eq', 200);
          cy.wait('@getFacets').its('response.statusCode').should('eq', 200);
          MarcAuthorities.verifySearchTabIsOpened();

          // Select "Advanced search" option
          MarcAuthorities.selectSearchOptionInDropdown(testData.searchOption);
          MarcAuthorities.checkSelectOptionFieldContent(testData.searchOption);

          // Step 1: Fill in the search box with advanced search query
          MarcAuthoritiesSearch.fillSearchInput(searchQuery);
          cy.wait(2000);

          // Step 2: Click "Search" and verify all 3 authority records are found
          MarcAuthoritiesSearch.clickSearchButton();
          authorityHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading);
          });
        },
      );
    });
  });
});
