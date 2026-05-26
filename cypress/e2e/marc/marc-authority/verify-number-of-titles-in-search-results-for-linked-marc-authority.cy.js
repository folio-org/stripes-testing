import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Result list / sorting', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(15);

      const testData = {
        uuidSearchOption: 'Authority UUID',
        bib1Title: `AT_C367929_MarcBibInstance_Journal_${randomPostfix}`,
        bib2Title: `AT_C367929_MarcBibInstance_Crossfire_${randomPostfix}`,
        dugmoreHeading: `AT_C367929_MarcAuthority_Dugmore_${randomPostfix}`,
        dugmoreReference: `AT_C367929_DugmoreRef_${randomPostfix}`,
        woodsonHeading: `AT_C367929_MarcAuthority_Woodson_${randomPostfix}`,
        chinHeading: `AT_C367929_MarcAuthority_Chin_${randomPostfix}`,
        leeHeading: `AT_C367929_MarcAuthority_Lee_${randomPostfix}`,
        feministPoetryHeading: `AT_C367929_Poetry_${randomPostfix}_Feminist`,
        poetryReference: `AT_C367929_Poetry_${randomPostfix}_Regular`,
      };

      const poetryQuery = `AT_C367929_Poetry_${randomPostfix}`;

      // naturalIds for authority records
      const dugmoreNaturalId = `367929${randomDigits}1`;
      const woodsonNaturalId = `367929${randomDigits}2`;
      const chinNaturalId = `367929${randomDigits}3`;
      const leeNaturalId = `367929${randomDigits}4`;
      const feministPoetryNaturalId = `367929${randomDigits}5`;

      let userData;
      let dugmoreId;
      let woodsonId;
      let chinId;
      let leeId;
      let feministPoetryId;
      let bib1Id;
      let bib2Id;

      // Bib 1 (Journal): fields in creation order → LDR(0), 001(1), 008(2), 245(3), 700-Dugmore(4), 700-Woodson(5)
      // bibFieldIndexes (1-based): Dugmore 700 = 5, Woodson 700 = 6
      const bib1Fields = [
        { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
        {
          tag: '245',
          content: `$a ${testData.bib1Title}`,
          indicators: ['1', '1'],
        },
        {
          tag: '700',
          content: `$a ${testData.dugmoreHeading}`,
          indicators: ['1', '\\'],
        },
        {
          tag: '700',
          content: `$a ${testData.woodsonHeading}`,
          indicators: ['1', '\\'],
        },
      ];

      // Bib 2 (Crossfire): fields in creation order
      // → LDR(0), 001(1), 008(2), 245(3), 100(4)-Chin, 650(5)-FeministPoetry, 700(6)-Woodson, 700(7)-Chin
      // bibFieldIndexes (1-based): 100-Chin=5, 650-FP=6, 700-Woodson=7, 700-Chin=8
      const bib2Fields = [
        { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
        {
          tag: '245',
          content: `$a ${testData.bib2Title}`,
          indicators: ['1', '0'],
        },
        {
          tag: '100',
          content: `$a ${testData.chinHeading}`,
          indicators: ['1', '\\'],
        },
        {
          tag: '650',
          content: `$a ${testData.feministPoetryHeading}`,
          indicators: ['\\', '0'],
        },
        {
          tag: '700',
          content: `$a ${testData.woodsonHeading}`,
          indicators: ['1', '\\'],
        },
        {
          tag: '700',
          content: `$a ${testData.chinHeading}`,
          indicators: ['1', '\\'],
        },
      ];

      before('Create user, data and link records', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C367929_');

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          userData = userProperties;

          cy.then(() => {
            // Create authority records
            MarcAuthorities.createMarcAuthorityViaAPI('', dugmoreNaturalId, [
              {
                tag: '100',
                content: `$a ${testData.dugmoreHeading}`,
                indicators: ['1', '\\'],
              },
              {
                tag: '400',
                content: `$a ${testData.dugmoreReference}`,
                indicators: ['1', '\\'],
              },
            ]).then((id) => {
              dugmoreId = id;
            });

            MarcAuthorities.createMarcAuthorityViaAPI('', woodsonNaturalId, [
              {
                tag: '100',
                content: `$a ${testData.woodsonHeading}`,
                indicators: ['1', '\\'],
              },
            ]).then((id) => {
              woodsonId = id;
            });

            MarcAuthorities.createMarcAuthorityViaAPI('', chinNaturalId, [
              {
                tag: '100',
                content: `$a ${testData.chinHeading}`,
                indicators: ['1', '\\'],
              },
            ]).then((id) => {
              chinId = id;
            });

            MarcAuthorities.createMarcAuthorityViaAPI('', leeNaturalId, [
              {
                tag: '100',
                content: `$a ${testData.leeHeading}`,
                indicators: ['1', '\\'],
              },
            ]).then((id) => {
              leeId = id;
            });

            MarcAuthorities.createMarcAuthorityViaAPI('', feministPoetryNaturalId, [
              {
                tag: '150',
                content: `$a ${testData.feministPoetryHeading}`,
                indicators: ['\\', '\\'],
              },
              {
                tag: '450',
                content: `$a ${testData.poetryReference}`,
                indicators: ['\\', '\\'],
              },
            ]).then((id) => {
              feministPoetryId = id;
            });

            // Create bib records
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bib1Fields).then(
              (id) => {
                bib1Id = id;
              },
            );

            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bib2Fields).then(
              (id) => {
                bib2Id = id;
              },
            );
          })
            .then(() => {
              // Link Bib1 (Journal): 700→Dugmore(100), 700→Woodson(100)
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: bib1Id,
                authorityIds: [dugmoreId, woodsonId],
                bibFieldTags: ['700', '700'],
                authorityFieldTags: ['100', '100'],
                finalBibFieldContents: [
                  `$a ${testData.dugmoreHeading}`,
                  `$a ${testData.woodsonHeading}`,
                ],
                bibFieldIndexes: [5, 6],
              });

              // Link Bib2 (Crossfire): 100→Chin(100), 650→FeministPoetry(150), 700→Woodson(100), 700→Chin(100)
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: bib2Id,
                authorityIds: [chinId, feministPoetryId, woodsonId, chinId],
                bibFieldTags: ['100', '650', '700', '700'],
                authorityFieldTags: ['100', '150', '100', '100'],
                finalBibFieldContents: [
                  `$a ${testData.chinHeading}`,
                  `$a ${testData.feministPoetryHeading}`,
                  `$a ${testData.woodsonHeading}`,
                  `$a ${testData.chinHeading}`,
                ],
                bibFieldIndexes: [5, 6, 7, 8],
              });
            })
            .then(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
                authRefresh: true,
              });
              MarcAuthorities.verifySearchTabIsOpened();
            });
        });
      });

      after('Delete user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
        InventoryInstance.deleteInstanceViaApi(bib1Id);
        InventoryInstance.deleteInstanceViaApi(bib2Id);
        MarcAuthority.deleteViaAPI(dugmoreId, true);
        MarcAuthority.deleteViaAPI(woodsonId, true);
        MarcAuthority.deleteViaAPI(chinId, true);
        MarcAuthority.deleteViaAPI(leeId, true);
        MarcAuthority.deleteViaAPI(feministPoetryId, true);
      });

      it(
        'C367929 Verify that correct number of linked records are displayed in the "Number of titles" column when searching for linked "MARC Authority" records (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C367929'] },
        () => {
          // Steps 1-2: Search Dugmore authorized heading → 1 title
          MarcAuthorities.searchBeats(testData.dugmoreHeading);
          MarcAuthorities.verifyNumberOfTitlesForRowWithValue(testData.dugmoreHeading, 1);

          // Step 3: Click "1" → Inventory opens in same tab with 1 result (Journal)
          MarcAuthorities.clickOnNumberOfTitlesForRowWithValue(testData.dugmoreHeading, 1);
          InventoryInstances.waitLoading();
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventorySearchAndFilter.verifySearchResult(testData.bib1Title);
          InventoryInstances.verifySelectedSearchOption(testData.uuidSearchOption);
          InventorySearchAndFilter.checkSearchQueryText(dugmoreId);

          // Step 4: Navigate back to MARC Authorities
          InventoryInstance.goToPreviousPage();
          cy.wait(1000);
          InventoryInstances.waitLoading();
          InventoryInstance.goToPreviousPage();
          MarcAuthorities.waitLoading();

          // Steps 5-6: Search Woodson authorized heading → 2 titles
          MarcAuthorities.searchBeats(testData.woodsonHeading);
          MarcAuthorities.verifyNumberOfTitlesForRowWithValue(testData.woodsonHeading, 2);

          // Step 7: Click "2" → Inventory opens with 2 results (Journal + Crossfire)
          MarcAuthorities.clickOnNumberOfTitlesForRowWithValue(testData.woodsonHeading, 2);
          InventoryInstances.waitLoading();
          InventorySearchAndFilter.verifyNumberOfSearchResults(2);
          InventorySearchAndFilter.verifySearchResult(testData.bib1Title);
          InventorySearchAndFilter.verifySearchResult(testData.bib2Title);
          InventoryInstances.verifySelectedSearchOption(testData.uuidSearchOption);
          InventorySearchAndFilter.checkSearchQueryText(woodsonId);

          // Step 8: Navigate back to MARC Authorities
          InventoryInstance.goToPreviousPage();
          MarcAuthorities.waitLoading();

          // Steps 9-10: Search Chin authorized heading → 1 title
          // (Bib2 has both 100 and 700 linked to Chin, but counts as 1 instance)
          MarcAuthorities.searchBeats(testData.chinHeading);
          MarcAuthorities.verifyNumberOfTitlesForRowWithValue(testData.chinHeading, 1);
          MarcAuthority.contains(testData.chinHeading);

          // Steps 11-12: Search Dugmore reference heading → empty "Number of titles"
          MarcAuthorities.searchBeats(testData.dugmoreReference);
          MarcAuthorities.verifyEmptyNumberOfTitlesForRowWithValue(testData.dugmoreReference);
          MarcAuthority.contains(testData.dugmoreReference);

          // Steps 13-14: Search Lee authorized heading (no linked bibs) → empty "Number of titles"
          MarcAuthorities.searchBeats(testData.leeHeading);
          MarcAuthorities.verifyEmptyNumberOfTitlesForRowWithValue(testData.leeHeading);
          MarcAuthority.contains(testData.leeHeading);

          // Steps 15-16: Search Poetry reference → Feminist poetry = 1 title, Poetry reference = empty
          MarcAuthorities.searchBeats(poetryQuery);
          MarcAuthorities.verifyNumberOfTitlesForRowWithValue(testData.feministPoetryHeading, 1);
          MarcAuthorities.verifyEmptyNumberOfTitlesForRowWithValue(testData.poetryReference);
        },
      );
    });
  });
});
