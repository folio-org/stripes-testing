import {
  ADVANCED_SEARCH_LOGICAL_OPERATORS,
  ADVANCED_SEARCH_MODIFIERS,
  MARC_AUTHORITY_SEARCH_OPTIONS,
  AUTHORITY_TYPES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities, {
  valid008FieldValues,
} from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { getRandomLetters } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Advanced Search', () => {
      // Every part matched by the advanced search carries its own random letters, so the result
      // list contains only the records created here, whatever else is in the env
      const randomLetters = getRandomLetters(15);
      const typeAuthorized = AUTHORITY_TYPES.AUTHORIZED;
      const typeReference = AUTHORITY_TYPES.REFERENCE;
      const headingTypePersonal = 'Personal Name';
      const headingTypeTopical = 'Topical';
      const headingTypeGeographic = 'Geographic Name';
      // Thesaurus (008/11): "a" - Library of Congress Subject Headings,
      // "b" - LC subject headings for children's literature
      const thesaurusLcsh = 'Library of Congress Subject Headings';
      const thesaurusLcChildrens = 'b';

      const personalName = {
        surname: `AT_C409435_MarcAuthority_Jack${randomLetters}`,
        forename: `Adrienne${randomLetters}`,
      };
      const personalNameHeading = `${personalName.surname}, ${personalName.forename}`;
      const personalNameReference = `${personalName.surname}, Michael ${personalName.forename}`;
      const subjectHeading = `AT_C409435_Maps${randomLetters} - Montessori method of education`;
      const geographicName = `AT_C409435_MarcAuthority_Belarus${randomLetters}`;
      const geographicNameReferences = [
        `Republic of ${geographicName}`,
        `Parliament ${geographicName}`,
      ];
      // Contains the geographic name as a phrase, so the exact phrase search finds it as well
      const geographicNameAntiquities = `${geographicName} Antiquities`;

      const searchConfigurations = [
        {
          query: `${personalName.surname}, ${personalName.forename}`,
          operator: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
        },
        {
          booleanOperator: ADVANCED_SEARCH_LOGICAL_OPERATORS.OR,
          query: subjectHeading,
          operator: ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.SUBJECT,
        },
        {
          booleanOperator: ADVANCED_SEARCH_LOGICAL_OPERATORS.OR,
          query: geographicName,
          operator: ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.GEOGRAPHIC_NAME,
        },
      ];

      const personalNameRows = [
        { type: typeAuthorized, heading: personalNameHeading, headingType: headingTypePersonal },
        { type: typeReference, heading: personalNameReference, headingType: headingTypePersonal },
      ];
      const subjectRows = [
        { type: typeAuthorized, heading: subjectHeading, headingType: headingTypeTopical },
      ];
      const geographicNameRows = [
        { type: typeAuthorized, heading: geographicName, headingType: headingTypeGeographic },
        ...geographicNameReferences.map((heading) => ({
          type: typeReference,
          heading,
          headingType: headingTypeGeographic,
        })),
        {
          type: typeAuthorized,
          heading: geographicNameAntiquities,
          headingType: headingTypeGeographic,
        },
      ];
      const allRows = [...personalNameRows, ...subjectRows, ...geographicNameRows];

      const authorityRecords = [
        {
          // Personal Name, LCSH
          fields: [
            { tag: '100', content: `$a ${personalNameHeading}`, indicators: ['1', '\\'] },
            { tag: '400', content: `$a ${personalNameReference}`, indicators: ['1', '\\'] },
          ],
        },
        {
          // Topical, LC subject headings for children's literature - the only record the
          // Thesaurus facet removes
          fields: [{ tag: '150', content: `$a ${subjectHeading}`, indicators: ['\\', '\\'] }],
          tag008Values: {
            ...valid008FieldValues,
            'SH Sys': thesaurusLcChildrens,
          },
        },
        {
          // Geographic Name, LCSH
          fields: [
            { tag: '151', content: `$a ${geographicName}`, indicators: ['\\', '\\'] },
            ...geographicNameReferences.map((heading) => ({
              tag: '451',
              content: `$a ${heading}`,
              indicators: ['\\', '\\'],
            })),
          ],
        },
        {
          // Geographic Name, LCSH
          fields: [
            { tag: '151', content: `$a ${geographicNameAntiquities}`, indicators: ['\\', '\\'] },
          ],
        },
      ];
      const createdAuthorityIds = [];
      const testData = {};

      // Created records are all new, so they fall into "yesterday - today" (UTC, as in the
      // other Date created specs)
      const toIsoDate = (date) => date.toISOString().split('T')[0];
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const verifyRows = (rows, isShown = true) => {
        rows.forEach(({ type, heading, headingType }) => {
          if (isShown) MarcAuthorities.checkRowByContent(`${type}${heading}${headingType}`);
          else MarcAuthorities.checkRowAbsentByContent(`${type}${heading}${headingType}`);
        });
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C409435_');

        cy.then(() => {
          authorityRecords.forEach(({ fields, tag008Values }, index) => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              randomLetters,
              `409435${index + 1}`,
              fields,
              undefined,
              tag008Values,
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });
          });
        }).then(() => {
          cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
            (userProperties) => {
              testData.user = userProperties;

              cy.waitForAuthRefresh(() => {
                cy.login(testData.user.username, testData.user.password, {
                  path: TopMenu.marcAuthorities,
                  waiter: MarcAuthorities.waitLoading,
                });
              });
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        createdAuthorityIds.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C409435 Apply facets to the search result list when advanced search of "MARC authority" records was executed (promin)',
        { tags: ['extendedPath', 'promin', 'C409435'] },
        () => {
          // Step 1: open the "Advanced search" modal
          MarcAuthorities.clickAdvancedSearchButton();

          // Steps 2-4: configure the 3 rows
          searchConfigurations.forEach((config, index) => {
            MarcAuthorities.fillAdvancedSearchField(
              index,
              config.query,
              config.searchOption,
              config.booleanOperator,
              config.operator,
            );
          });

          // Step 5: search - the personal name (2 rows), the subject (1 row) and the geographic
          // name (the heading, its 2 references and the heading containing the phrase) are shown
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();
          MarcAuthorities.checkRowsCount(allRows.length);
          verifyRows(allRows);

          // Step 6: "Thesaurus" facet - LCSH leaves out the subject (LC children's literature)
          MarcAuthorities.verifyThesaurusAccordionAndClick();
          MarcAuthorities.chooseThesaurus(thesaurusLcsh);
          MarcAuthorities.verifySelectedTextOfThesaurus(thesaurusLcsh);
          MarcAuthorities.checkRowsCount(personalNameRows.length + geographicNameRows.length);
          verifyRows([...personalNameRows, ...geographicNameRows]);
          verifyRows(subjectRows, false);

          // Step 7: "Type of heading" facet - "Geographic Name" leaves out the personal name
          MarcAuthorities.chooseTypeOfHeading(headingTypeGeographic);
          MarcAuthorities.checkRowsCount(geographicNameRows.length);
          verifyRows(geographicNameRows);
          verifyRows(personalNameRows, false);

          // Step 8: "Date created" filter - the records were created within the range
          MarcAuthoritiesSearch.filterByDateCreated(toIsoDate(yesterday), toIsoDate(today));
          MarcAuthorities.checkRowsCount(geographicNameRows.length);
          verifyRows(geographicNameRows);
        },
      );
    });
  });
});
