import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../support/constants';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Result list / sorting', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();

        const testData = {
          diCaprioHeading: `AT_C404463_MarcAuthority_DiCaprio_${randomPostfix}`,
          jacksonHeading: `AT_C404463_MarcAuthority_Jackson_${randomPostfix}`,
          bib1Title: `AT_C404463_MarcBibInstance_Shared1_${randomPostfix}`,
          bib2Title: `AT_C404463_MarcBibInstance_Shared2_${randomPostfix}`,
          bib3Title: `AT_C404463_MarcBibInstance_Local_${randomPostfix}`,
          tag100: '100',
          tag700: '700',
          naturalIdPrefix: `404463${randomNDigitNumber(15)}`,
        };

        const getMarcBibFields = (instanceTitle, authorityHeadings) => [
          {
            tag: '008',
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: '245',
            content: `$a ${instanceTitle}`,
            indicators: ['1', '\\'],
          },
          ...authorityHeadings.map((heading) => ({
            tag: '700',
            content: `$a ${heading}`,
            indicators: ['1', '\\'],
          })),
        ];

        let authorityId;
        let jacksonAuthorityId;
        let bib1Id;
        let bib2Id;
        let bib3Id;
        let holdingId;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          [Affiliations.College, Affiliations.Consortia].forEach((affiliation) => {
            cy.withinTenant(affiliation, () => {
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C404463_');
            });
          });

          // Create Shared DiCaprio authority in Central
          cy.resetTenant();
          MarcAuthorities.createMarcAuthorityViaAPI('', `${testData.naturalIdPrefix}1`, [
            {
              tag: testData.tag100,
              content: `$a ${testData.diCaprioHeading}`,
              indicators: ['1', '\\'],
            },
          ]).then((createdId) => {
            authorityId = createdId;
          });

          // Create 2 Shared MARC bibs in Central
          cy.then(() => {
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              getMarcBibFields(testData.bib1Title, [testData.diCaprioHeading]),
            ).then((id) => {
              bib1Id = id;
            });
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              getMarcBibFields(testData.bib2Title, [testData.diCaprioHeading]),
            ).then((id) => {
              bib2Id = id;
            });
          })
            .then(() => {
              // Link bib1 700 → DiCaprio
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: bib1Id,
                authorityIds: [authorityId],
                bibFieldTags: [testData.tag700],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [`$a ${testData.diCaprioHeading}`],
              });
              // Link bib2 700 → DiCaprio
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: bib2Id,
                authorityIds: [authorityId],
                bibFieldTags: [testData.tag700],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [`$a ${testData.diCaprioHeading}`],
              });
            })
            .then(() => {
              // College: create Holdings (shadow copy) for bib2, Jackson authority, local bib3
              cy.setTenant(Affiliations.College);
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
              }).then((res) => {
                InventoryHoldings.getHoldingsFolioSource().then((holdingSource) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: bib2Id,
                    permanentLocationId: res.id,
                    sourceId: holdingSource.id,
                  }).then((holding) => {
                    holdingId = holding.id;
                  });
                });
              });
              MarcAuthorities.createMarcAuthorityViaAPI('', `${testData.naturalIdPrefix}2`, [
                {
                  tag: testData.tag100,
                  content: `$a ${testData.jacksonHeading}`,
                  indicators: ['1', '\\'],
                },
              ]).then((id) => {
                jacksonAuthorityId = id;
              });
              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                getMarcBibFields(testData.bib3Title, [
                  testData.diCaprioHeading,
                  testData.jacksonHeading,
                ]),
              ).then((id) => {
                bib3Id = id;
              });
            })
            .then(() => {
              // College: link bib3 700s → DiCaprio + Jackson
              cy.setTenant(Affiliations.College);
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: bib3Id,
                authorityIds: [authorityId, jacksonAuthorityId],
                bibFieldTags: [testData.tag700, testData.tag700],
                authorityFieldTags: [testData.tag100, testData.tag100],
                finalBibFieldContents: [
                  `$a ${testData.diCaprioHeading}`,
                  `$a ${testData.jacksonHeading}`,
                ],
                bibFieldIndexes: [5, 6],
              });
            });

          // Create user with permissions in Central and College
          cy.then(() => {
            cy.resetTenant();
            cy.createTempUser([
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.inventoryAll.gui,
            ]).then((createdUserProperties) => {
              testData.userProperties = createdUserProperties;

              cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.inventoryAll.gui,
              ]);

              cy.resetTenant();
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          MarcAuthority.deleteViaAPI(authorityId, true);
          InventoryInstance.deleteInstanceViaApi(bib1Id);
          cy.setTenant(Affiliations.College);
          InventoryHoldings.deleteHoldingRecordViaApi(holdingId);
          MarcAuthority.deleteViaAPI(jacksonAuthorityId);
          InventoryInstance.deleteInstanceViaApi(bib3Id);
          cy.resetTenant();
          InventoryInstance.deleteInstanceViaApi(bib2Id);
        });

        it(
          'C404463 Verify that "Number of titles" link shows only existing records for Central tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C404463'] },
          () => {
            // Step 1: Search for DiCaprio authority by Keyword → open detail view
            MarcAuthorities.searchBeats(testData.diCaprioHeading);
            MarcAuthorities.selectIncludingTitle(testData.diCaprioHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.diCaprioHeading);

            // Step 2: Close the detail view → verify "Number of titles" = 2 for DiCaprio in Search results
            MarcAuthorities.closeMarcViewPane();
            MarcAuthorities.verifyNumberOfTitlesForRowWithValue(testData.diCaprioHeading, 2);

            // Step 3: Click "2" → navigate to Inventory and verify 2 linked bib records
            MarcAuthorities.clickOnNumberOfTitlesForRowWithValue(testData.diCaprioHeading, 2);
            InventoryInstances.waitLoading();
            InventorySearchAndFilter.verifyNumberOfSearchResults(2);
            InventorySearchAndFilter.verifySearchResult(testData.bib1Title);
            InventorySearchAndFilter.verifySearchResult(testData.bib2Title);

            // Step 4: Navigate back to MARC Authorities
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();

            // Step 5: Search for Jackson (local Member authority) → no results in Central
            MarcAuthorities.searchBeats(testData.jacksonHeading);
            MarcAuthorities.verifyEmptySearchResults(testData.jacksonHeading);

            // Step 6: Switch to Browse mode
            MarcAuthorities.switchToBrowse();
            MarcAuthorities.verifyBrowseTabIsOpened();

            // Step 7: Browse for DiCaprio → verify "2" in Number of titles
            MarcAuthorityBrowse.searchBy(
              MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
              testData.diCaprioHeading,
            );
            MarcAuthorities.verifyNumberOfTitlesForRowWithValue(testData.diCaprioHeading, 2);

            // Step 8: Click "2" → navigate to Inventory and verify 2 linked bib records
            MarcAuthorities.clickOnNumberOfTitlesForRowWithValue(testData.diCaprioHeading, 2);
            InventoryInstances.waitLoading();
            InventorySearchAndFilter.verifyNumberOfSearchResults(2);
            InventorySearchAndFilter.verifySearchResult(testData.bib1Title);
            InventorySearchAndFilter.verifySearchResult(testData.bib2Title);

            // Step 9: Navigate back to MARC Authorities Browse
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();
            MarcAuthorities.switchToBrowse();
            MarcAuthorities.verifyBrowseTabIsOpened();

            // Step 10: Browse for Jackson → "would be here" (local record not visible in Central)
            MarcAuthorityBrowse.searchBy(
              MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
              testData.jacksonHeading,
            );
            MarcAuthorityBrowse.checkResultWithNoValue(testData.jacksonHeading);
          },
        );
      });
    });
  });
});
