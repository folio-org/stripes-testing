import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import {
  MARC_AUTHORITY_SEARCH_OPTIONS,
  REFERENCES_FILTER_CHECKBOXES,
  AUTHORITY_TYPES,
} from '../../../../../support/constants';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Search', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();

        // Shared prefix and base number for test-specific naturalIds (used in 010, 024, 035 fields)
        const testNaturalIdPrefix = getRandomLetters(13);
        const testBaseNumber = `422234${randomNDigitNumber(9)}`;
        const naturalId1 = `${testNaturalIdPrefix} ${testBaseNumber}1`;
        const naturalId2 = `${testNaturalIdPrefix} ${testBaseNumber}2`;

        // Shared prefix and base number for 001-only naturalIds (records where test doesn't define 001 content)
        const field001Prefix = getRandomLetters(15);
        const field001BaseNumber = randomNDigitNumber(9).toString();
        const naturalId3 = `${field001Prefix}${field001BaseNumber}3`;
        const naturalId4 = `${field001Prefix}${field001BaseNumber}4`;
        const naturalId5 = `${field001Prefix}${field001BaseNumber}5`;
        const naturalId6 = `${field001Prefix}${field001BaseNumber}6`;

        const marcFieldTags = {
          tag001: '001',
          tag010: '010',
          tag024: '024',
          tag035: '035',
          tag100: '100',
        };

        const indicatorValues = ['\\', '\\'];
        const entityPrefix = `AT_C422234_MarcAuthority_${randomPostfix}`;
        const lccnSearchOption = MARC_AUTHORITY_SEARCH_OPTIONS.LCCN;

        const testData = {
          lccnSearchValue1: naturalId1,
          lccnSearchValue2: naturalId2,
          sharedRecordTitle: `${entityPrefix}_Shared_2`,
          localRecordTitle: `${entityPrefix}_Local_2`,
          authorizedType: AUTHORITY_TYPES.AUTHORIZED,
          sharedIconText: 'Shared',
        };

        // Central (Shared) authority records - fields without 001 (constructed by MarcAuthorities.createMarcAuthorityViaAPI)
        const getCentralAuthorityFields = () => [
          [
            {
              tag: marcFieldTags.tag024,
              content: `$a ${naturalId2}`,
              indicators: indicatorValues,
            },
            {
              tag: marcFieldTags.tag100,
              content: `$a ${testData} Shared record 1`,
              indicators: indicatorValues,
            },
          ],
          [
            {
              tag: marcFieldTags.tag010,
              content: `$a ${naturalId1} $z ${naturalId2}`,
              indicators: indicatorValues,
            },
            {
              tag: marcFieldTags.tag100,
              content: `$a ${testData.sharedRecordTitle}`,
              indicators: indicatorValues,
            },
          ],
          [
            {
              tag: marcFieldTags.tag024,
              content: `$a ${naturalId1}`,
              indicators: indicatorValues,
            },
            {
              tag: marcFieldTags.tag100,
              content: `$a ${entityPrefix} Shared record 3`,
              indicators: indicatorValues,
            },
          ],
          [
            {
              tag: marcFieldTags.tag035,
              content: `$a (OCoLC)${naturalId1}`,
              indicators: indicatorValues,
            },
            {
              tag: marcFieldTags.tag035,
              content: `$a (OCoLC)${naturalId2}`,
              indicators: indicatorValues,
            },
            {
              tag: marcFieldTags.tag100,
              content: `$a ${entityPrefix} Shared record 4`,
              indicators: indicatorValues,
            },
          ],
        ];

        // 001 field values for Central authority records
        const getCentral001Values = () => [naturalId1, naturalId3, naturalId2, naturalId4];

        // College (Local) authority records - fields without 001 (constructed by MarcAuthorities.createMarcAuthorityViaAPI)
        const getCollegeAuthorityFields = () => [
          [
            {
              tag: marcFieldTags.tag024,
              content: `$a ${naturalId2}`,
              indicators: indicatorValues,
            },
            {
              tag: marcFieldTags.tag100,
              content: `$a ${entityPrefix} Local record 1`,
              indicators: indicatorValues,
            },
          ],
          [
            {
              tag: marcFieldTags.tag010,
              content: `$a ${naturalId1} $z ${naturalId2}`,
              indicators: indicatorValues,
            },
            {
              tag: marcFieldTags.tag100,
              content: `$a ${testData.localRecordTitle}`,
              indicators: indicatorValues,
            },
          ],
          [
            {
              tag: marcFieldTags.tag024,
              content: `$a ${naturalId1}`,
              indicators: indicatorValues,
            },
            {
              tag: marcFieldTags.tag100,
              content: `$a ${entityPrefix} Local record 3`,
              indicators: indicatorValues,
            },
          ],
          [
            {
              tag: marcFieldTags.tag035,
              content: `$a (OCoLC)${naturalId1}`,
              indicators: indicatorValues,
            },
            {
              tag: marcFieldTags.tag035,
              content: `$a (OCoLC)${naturalId2}`,
              indicators: indicatorValues,
            },
            {
              tag: marcFieldTags.tag100,
              content: `$a ${entityPrefix} Local record 4`,
              indicators: indicatorValues,
            },
          ],
        ];

        // 001 field values for College authority records
        const getCollege001Values = () => [naturalId1, naturalId5, naturalId2, naturalId6];

        const users = {};
        const collegeAuthorityIds = [];
        const centralAuthorityIds = [];

        before('Create users and authority records', () => {
          cy.getAdminToken();

          // Create 4 authority records in Central tenant
          const centralFields = getCentralAuthorityFields();
          const central001Values = getCentral001Values();
          centralFields.forEach((fields, index) => {
            MarcAuthorities.createMarcAuthorityViaAPI('', central001Values[index], fields).then(
              (id) => {
                centralAuthorityIds.push(id);
              },
            );
          });

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ])
            .then((userProperties) => {
              users.userProperties = userProperties;
            })
            .then(() => {
              cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(users.userProperties.userId, [
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              ]);

              // Create 4 authority records in College tenant
              const collegeFields = getCollegeAuthorityFields();
              const college001Values = getCollege001Values();
              collegeFields.forEach((fields, index) => {
                MarcAuthorities.createMarcAuthorityViaAPI('', college001Values[index], fields).then(
                  (id) => {
                    collegeAuthorityIds.push(id);
                  },
                );
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
        });

        after('Delete users and authority records', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(users.userProperties.userId);
          // Delete Central authority records (first 4)
          centralAuthorityIds.forEach((id) => {
            MarcAuthority.deleteViaAPI(id);
          });

          // Delete College authority records (last 4)
          cy.setTenant(Affiliations.College);
          collegeAuthorityIds.forEach((id) => {
            MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C422234 Shared and Local (for current tenant) "MARC authority" records are found in "MARC authority" app from Member tenant by "LCCN" (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C422234'] },
          () => {
            // Precondition: Check both checkboxes in References accordion
            MarcAuthoritiesSearch.selectExcludeReferencesFilter(
              REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
            );
            MarcAuthoritiesSearch.selectExcludeReferencesFilter(
              REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
            );

            // Step 1: Run search by LCCN for "n 79066095" in Central tenant
            MarcAuthoritiesSearch.selectSearchOption(lccnSearchOption);
            MarcAuthoritiesSearch.fillSearchInput(testData.lccnSearchValue1);
            MarcAuthoritiesSearch.clickSearchButton();
            MarcAuthorities.checkAfterSearch(
              testData.authorizedType,
              `${testData.sharedIconText}${testData.sharedRecordTitle}`,
            );
            MarcAuthorities.checkRowsCount(1);

            // Step 2: Reset all filters
            MarcAuthorities.clickResetAndCheck();
            MarcAuthorities.checkRecordsResultListIsAbsent();

            // Step 3: Check both checkboxes in References accordion
            MarcAuthoritiesSearch.selectExcludeReferencesFilter(
              REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
            );
            MarcAuthoritiesSearch.selectExcludeReferencesFilter(
              REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
            );

            // Step 4: Run search by LCCN for "n 79066096"
            MarcAuthoritiesSearch.selectSearchOption(lccnSearchOption);
            MarcAuthoritiesSearch.fillSearchInput(testData.lccnSearchValue2);
            MarcAuthoritiesSearch.clickSearchButton();
            MarcAuthorities.checkAfterSearch(
              testData.authorizedType,
              `${testData.sharedIconText}${testData.sharedRecordTitle}`,
            );
            MarcAuthorities.checkRowsCount(1);

            // Step 5: Switch affiliation to Member tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            MarcAuthorities.waitLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            // Step 6: Run search by LCCN for "n 79066095" in Member tenant
            MarcAuthoritiesSearch.selectSearchOption(lccnSearchOption);
            MarcAuthoritiesSearch.fillSearchInput(testData.lccnSearchValue1);
            MarcAuthoritiesSearch.clickSearchButton();
            MarcAuthorities.checkAfterSearch(
              testData.authorizedType,
              `${testData.sharedIconText}${testData.sharedRecordTitle}`,
            );
            MarcAuthorities.checkAfterSearch(testData.authorizedType, testData.localRecordTitle);
            MarcAuthorities.checkRowsCount(2);

            // Step 7: Reset all filters
            MarcAuthorities.clickResetAndCheck();
            MarcAuthorities.checkRecordsResultListIsAbsent();

            // Step 8: Check both checkboxes in References accordion
            MarcAuthoritiesSearch.selectExcludeReferencesFilter(
              REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
            );
            MarcAuthoritiesSearch.selectExcludeReferencesFilter(
              REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
            );

            // Step 9: Run search by LCCN for "n 79066096" in Member tenant
            MarcAuthoritiesSearch.selectSearchOption(lccnSearchOption);
            MarcAuthoritiesSearch.fillSearchInput(testData.lccnSearchValue2);
            MarcAuthoritiesSearch.clickSearchButton();
            MarcAuthorities.checkAfterSearch(
              testData.authorizedType,
              `${testData.sharedIconText}${testData.sharedRecordTitle}`,
            );
            MarcAuthorities.checkAfterSearch(testData.authorizedType, testData.localRecordTitle);
            MarcAuthorities.checkRowsCount(2);
          },
        );
      });
    });
  });
});
