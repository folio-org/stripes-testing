import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
  AUTHORITY_HEADING_TYPES,
  AUTHORITY_TYPES,
  ADVANCED_SEARCH_MODIFIERS,
  ADVANCED_SEARCH_LOGICAL_OPERATORS,
} from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Advanced Search', () => {
      function capitalizeWords(str) {
        return str
          .split(' ')
          .map((word) => {
            if (word.toLowerCase() === 'of') {
              return word.toLowerCase();
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(' ');
      }
      const headingTypes = Object.fromEntries(
        Object.entries(AUTHORITY_HEADING_TYPES).map(([key, value]) => [
          key,
          capitalizeWords(value),
        ]),
      );
      const testData = {
        marcFile: {
          marc: 'marcAuthFileC692244.mrc',
          fileName: `AT_C692244_testMarcFile_${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
        queryValue: 'AT_C692244_MarcAuthority',
        totalRecordsCount: 51,
        expectedResults: [
          {
            heading: 'AT_C692244_MarcAuthority Personal name 100',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.PERSONAL_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Personal name 400',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.PERSONAL_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Personal name 500',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.PERSONAL_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Personal name-title 100',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.PERSONAL_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Personal name-title 400',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.PERSONAL_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Personal name-title 500',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.PERSONAL_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Corporate name 110',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.CORPORATE_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Corporate name 410',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.CORPORATE_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Corporate name 510',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.CORPORATE_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Corporate name-title 110',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.CORPORATE_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Corporate name-title 410',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.CORPORATE_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Corporate name-title 510',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.CORPORATE_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Conference Name 111',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.CONFERENCE_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Conference Name 411',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.CONFERENCE_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Conference Name 511',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.CONFERENCE_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Conference Name-title 111',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.CONFERENCE_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Conference Name-title 411',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.CONFERENCE_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Conference Name-title 511',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.CONFERENCE_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Uniform title 130',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.UNIFORM_TITLE,
          },
          {
            heading: 'AT_C692244_MarcAuthority Uniform title 430',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.UNIFORM_TITLE,
          },
          {
            heading: 'AT_C692244_MarcAuthority Uniform title 530',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.UNIFORM_TITLE,
          },
          {
            heading: 'AT_C692244_MarcAuthority Named Event 147',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.NAMED_EVENT,
          },
          {
            heading: 'AT_C692244_MarcAuthority Named Event 447',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.NAMED_EVENT,
          },
          {
            heading: 'AT_C692244_MarcAuthority Named Event 547',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.NAMED_EVENT,
          },
          {
            heading: 'AT_C692244_MarcAuthority Chronological Term 148',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.CHRONOLOGICAL_TERM,
          },
          {
            heading: 'AT_C692244_MarcAuthority Chronological Term 448',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.CHRONOLOGICAL_TERM,
          },
          {
            heading: 'AT_C692244_MarcAuthority Chronological Term 548',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.CHRONOLOGICAL_TERM,
          },
          {
            heading: 'AT_C692244_MarcAuthority Subject 150',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.TOPICAL,
          },
          {
            heading: 'AT_C692244_MarcAuthority Subject 450',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.TOPICAL,
          },
          {
            heading: 'AT_C692244_MarcAuthority Subject 550',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.TOPICAL,
          },
          {
            heading: 'AT_C692244_MarcAuthority Geographic name 151',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.GEOGRAPHIC_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Geographic name 451',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.GEOGRAPHIC_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Geographic name 551',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.GEOGRAPHIC_NAME,
          },
          {
            heading: 'AT_C692244_MarcAuthority Genre 155',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.GENRE,
          },
          {
            heading: 'AT_C692244_MarcAuthority Genre 455',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.GENRE,
          },
          {
            heading: 'AT_C692244_MarcAuthority Genre 555',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.GENRE,
          },
          {
            heading: 'AT_C692244_MarcAuthority Medium of Performance Term 162',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.MEDIUM_OF_PERFORMANCE_TERM,
          },
          {
            heading: 'AT_C692244_MarcAuthority Medium of Performance Term 462',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.MEDIUM_OF_PERFORMANCE_TERM,
          },
          {
            heading: 'AT_C692244_MarcAuthority Medium of Performance Term 562',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.MEDIUM_OF_PERFORMANCE_TERM,
          },
          {
            heading: 'AT_C692244_MarcAuthority General Subdivision 180',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.GENERAL_SUBDIVISION,
          },
          {
            heading: 'AT_C692244_MarcAuthority General Subdivision 480',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.GENERAL_SUBDIVISION,
          },
          {
            heading: 'AT_C692244_MarcAuthority General Subdivision 580',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.GENERAL_SUBDIVISION,
          },
          {
            heading: 'AT_C692244_MarcAuthority Geographic Subdivision 181',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.GEOGRAPHIC_SUBDIVISION,
          },
          {
            heading: 'AT_C692244_MarcAuthority Geographic Subdivision 481',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.GEOGRAPHIC_SUBDIVISION,
          },
          {
            heading: 'AT_C692244_MarcAuthority Geographic Subdivision 581',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.GEOGRAPHIC_SUBDIVISION,
          },
          {
            heading: 'AT_C692244_MarcAuthority Chronological Subdivision 182',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.CHRONOLOGICAL_SUBDIVISION,
          },
          {
            heading: 'AT_C692244_MarcAuthority Chronological Subdivision 482',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.CHRONOLOGICAL_SUBDIVISION,
          },
          {
            heading: 'AT_C692244_MarcAuthority Chronological Subdivision 582',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.CHRONOLOGICAL_SUBDIVISION,
          },
          {
            heading: 'AT_C692244_MarcAuthority Form Subdivision 185',
            type: AUTHORITY_TYPES.AUTHORIZED,
            headingType: headingTypes.FORM_SUBDIVISION,
          },
          {
            heading: 'AT_C692244_MarcAuthority Form Subdivision 485',
            type: AUTHORITY_TYPES.REFERENCE,
            headingType: headingTypes.FORM_SUBDIVISION,
          },
          {
            heading: 'AT_C692244_MarcAuthority Form Subdivision 585',
            type: AUTHORITY_TYPES.AUTH_REF,
            headingType: headingTypes.FORM_SUBDIVISION,
          },
        ],
        customSearchConfigurations: [
          {
            query: 'AT_C692244_MarcAuthority',
            operator: ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
          },
          {
            booleanOperator: ADVANCED_SEARCH_LOGICAL_OPERATORS.AND,
            query: 'Chronological Subdivision',
            operator: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ANY,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
          },
          {
            booleanOperator: ADVANCED_SEARCH_LOGICAL_OPERATORS.OR,
            query: 'b  79132705692244',
            operator: ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.IDENTIFIER_ALL,
          },
          {
            booleanOperator: ADVANCED_SEARCH_LOGICAL_OPERATORS.OR,
            query: 'fst01133536692244',
            operator: ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.LCCN,
          },
          {
            booleanOperator: ADVANCED_SEARCH_LOGICAL_OPERATORS.NOT,
            query: 'General Geographic',
            operator: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ANY,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
          },
        ],
      };

      const expectedResultsCombinedQuery = [
        testData.expectedResults[45],
        testData.expectedResults[46],
        testData.expectedResults[47],
        testData.expectedResults[24],
        testData.expectedResults[25],
        testData.expectedResults[26],
        testData.expectedResults[48],
        testData.expectedResults[49],
        testData.expectedResults[50],
        testData.expectedResults[21],
        testData.expectedResults[22],
        testData.expectedResults[23],
      ];

      const createdAuthorityIDs = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C692244_');
        DataImport.uploadFileViaApi(
          testData.marcFile.marc,
          testData.marcFile.fileName,
          testData.marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIDs.push(record.authority.id);
          });
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C692244 Search for additional headings (147, 148, 162, 180, 181, 182, 185) using "Advanced search" option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C692244'] },
        () => {
          // Step 1: Click on the search option dropdown and select "Advanced search"
          MarcAuthorities.clickAdvancedSearchButton();

          // Step 2: Fill in the input field with query
          MarcAuthorities.fillAdvancedSearchField(
            0,
            testData.queryValue,
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            null,
            ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
          );

          // Step 3: Click "Search" and verify all imported records are found
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();
          MarcAuthorities.checkRowsCount(testData.totalRecordsCount);

          testData.expectedResults.forEach(({ heading, type, headingType }) => {
            MarcAuthorities.verifyResultsRowContent(heading, type, headingType);
          });

          // Step 4: Open "Advanced search" modal again and customize query with all boolean operators,
          // all input fields, all search operators, Keyword/Identifier (all)/LCCN search options
          MarcAuthorities.clickAdvancedSearchButton();

          testData.customSearchConfigurations.forEach((config, index) => {
            MarcAuthorities.fillAdvancedSearchField(
              index,
              config.query,
              config.searchOption,
              config.booleanOperator,
              config.operator,
            );
          });

          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();

          MarcAuthorities.checkRowsCount(expectedResultsCombinedQuery.length);
          expectedResultsCombinedQuery.forEach(({ heading, type, headingType }) => {
            MarcAuthorities.verifyResultsRowContent(heading, type, headingType);
          });
        },
      );
    });
  });
});
