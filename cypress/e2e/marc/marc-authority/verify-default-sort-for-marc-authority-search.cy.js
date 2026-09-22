import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities, {
  valid008FieldValues,
} from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const randomPostfix = getRandomPostfix();
    const naturalIdPrefix = `889738${randomNDigitNumber(15)}`;
    const titlePrefix = `AT_C889738_MarcAuthority_${randomPostfix}`;

    // 5 records per option: 2 "Other" + 3 "Specific", headings/lccns built as shared prefixes so
    // "general" matches all 5 (no reliance on "*" landing on page 1) and "specific" matches only
    // the 3 "Specific" ones - giving a real subset with a deterministic A-B-C-D-E sort order.
    const buildBatch = (label, tags, indicators, { hasTitle, isChildrens, lccnPrefix } = {}) => {
      const tagAt = (index) => (Array.isArray(tags) ? tags[index] : tags);
      const makeRecord = (index, heading, lccn) => ({
        tag: tagAt(index),
        indicators,
        heading,
        hasTitle,
        isChildrens,
        lccn,
      });
      const otherItems = ['A', 'B'].map((letter, index) => makeRecord(
        index,
        `${titlePrefix} ${label} Other Item ${letter}`,
        lccnPrefix ? `${lccnPrefix}${index + 1}` : undefined,
      ));
      const specificItems = ['A', 'B', 'C'].map((letter, index) => makeRecord(
        2 + index,
        `${titlePrefix} ${label} Specific Item ${letter}`,
        lccnPrefix ? `${lccnPrefix}3${index}` : undefined,
      ));
      const records = [...otherItems, ...specificItems];
      // Name-title records display "$a" + "$t" combined in the Heading/Reference column
      const displayHeading = (record) => (record.hasTitle ? `${record.heading} Test title` : record.heading);

      return {
        records,
        generalQuery: lccnPrefix ? `${lccnPrefix}*` : `${titlePrefix} ${label}`,
        specificQuery: lccnPrefix ? `${lccnPrefix}3*` : `${titlePrefix} ${label} Specific`,
        generalOrder: records.map(displayHeading),
        specificOrder: specificItems.map(displayHeading),
      };
    };

    const personalNameBatch = buildBatch('PersonalName', '100', ['1', '\\']);
    const corporateBatch = buildBatch(
      'CorporateConference',
      ['110', '111', '110', '111', '110'],
      ['2', '\\'],
    );
    const geographicBatch = buildBatch('Geographic', '151', ['\\', '\\']);
    const nameTitleBatch = buildBatch('NameTitle', '100', ['1', '\\'], { hasTitle: true });
    const uniformTitleBatch = buildBatch('UniformTitle', '130', ['0', '\\']);
    const subjectBatch = buildBatch('Subject', '150', ['\\', '0']);
    // The "Children's subject heading" distinction comes from the 008 "SH Sys" byte, not the
    // 150 field's own indicators - those stay blank, same as a plain LCSH subject
    const childrensSubjectBatch = buildBatch('ChildrensSubject', '150', ['\\', '\\'], {
      isChildrens: true,
    });
    const genreBatch = buildBatch('Genre', '155', ['\\', '\\']);
    const lccnBatch = buildBatch('Lccn', '100', ['1', '\\'], { lccnPrefix: `n${naturalIdPrefix}` });

    const typeBatches = [
      personalNameBatch,
      corporateBatch,
      geographicBatch,
      nameTitleBatch,
      uniformTitleBatch,
      subjectBatch,
      childrensSubjectBatch,
      genreBatch,
      lccnBatch,
    ];

    // Per search option: the "general" query (returns every record of that option's own set) and
    // the "specific" query (returns a proper subset of it)
    const searchScenarios = [
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
        allQuery: personalNameBatch.generalQuery,
        specificQuery: personalNameBatch.specificQuery,
        allOrder: personalNameBatch.generalOrder,
        specificOrder: personalNameBatch.specificOrder,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.IDENTIFIER_ALL,
        allQuery: lccnBatch.generalQuery,
        specificQuery: lccnBatch.specificQuery,
        allOrder: lccnBatch.generalOrder,
        specificOrder: lccnBatch.specificOrder,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.LCCN,
        allQuery: lccnBatch.generalQuery,
        specificQuery: lccnBatch.specificQuery,
        allOrder: lccnBatch.generalOrder,
        specificOrder: lccnBatch.specificOrder,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
        allQuery: personalNameBatch.generalQuery,
        specificQuery: personalNameBatch.specificQuery,
        allOrder: personalNameBatch.generalOrder,
        specificOrder: personalNameBatch.specificOrder,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.CORPORATE_CONFERENCE_NAME,
        allQuery: corporateBatch.generalQuery,
        specificQuery: corporateBatch.specificQuery,
        allOrder: corporateBatch.generalOrder,
        specificOrder: corporateBatch.specificOrder,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.GEOGRAPHIC_NAME,
        allQuery: geographicBatch.generalQuery,
        specificQuery: geographicBatch.specificQuery,
        allOrder: geographicBatch.generalOrder,
        specificOrder: geographicBatch.specificOrder,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.NAME_TITLE,
        allQuery: nameTitleBatch.generalQuery,
        specificQuery: nameTitleBatch.specificQuery,
        allOrder: nameTitleBatch.generalOrder,
        specificOrder: nameTitleBatch.specificOrder,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.UNIFORM_TITLE,
        allQuery: uniformTitleBatch.generalQuery,
        specificQuery: uniformTitleBatch.specificQuery,
        allOrder: uniformTitleBatch.generalOrder,
        specificOrder: uniformTitleBatch.specificOrder,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.SUBJECT,
        allQuery: subjectBatch.generalQuery,
        specificQuery: subjectBatch.specificQuery,
        allOrder: subjectBatch.generalOrder,
        specificOrder: subjectBatch.specificOrder,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.CHILDRENS_SUBJECT_HEADING,
        allQuery: childrensSubjectBatch.generalQuery,
        specificQuery: childrensSubjectBatch.specificQuery,
        allOrder: childrensSubjectBatch.generalOrder,
        specificOrder: childrensSubjectBatch.specificOrder,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.GENRE,
        allQuery: genreBatch.generalQuery,
        specificQuery: genreBatch.specificQuery,
        allOrder: genreBatch.generalOrder,
        specificOrder: genreBatch.specificOrder,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.ADVANCED_SEARCH,
        allQuery: `keyword containsAll ${personalNameBatch.generalQuery}`,
        specificQuery: `keyword containsAll ${personalNameBatch.specificQuery}`,
        allOrder: personalNameBatch.generalOrder,
        specificOrder: personalNameBatch.specificOrder,
      },
    ];

    const permissions = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];

    let user;
    const createdAuthorityIds = [];
    let recordIndex = 1;

    const createAuthority = (record) => {
      const content = record.hasTitle
        ? `$a ${record.heading} $t Test title`
        : `$a ${record.heading}`;
      const fields = [{ tag: record.tag, content, indicators: record.indicators }];
      if (record.lccn) {
        fields.unshift({ tag: '010', content: `$a ${record.lccn}`, indicators: ['\\', '\\'] });
      }
      const tag008Values = record.isChildrens
        ? { ...valid008FieldValues, 'SH Sys': 'b' }
        : valid008FieldValues;

      MarcAuthorities.createMarcAuthorityViaAPI(
        '',
        `${naturalIdPrefix}${recordIndex++}`,
        fields,
        undefined,
        tag008Values,
      ).then((id) => createdAuthorityIds.push(id));
    };

    before('Create user and test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C889738_');

      typeBatches.flatMap((batch) => batch.records).forEach(createAuthority);

      cy.createTempUser(permissions).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      createdAuthorityIds.forEach((id) => {
        MarcAuthority.deleteViaAPI(id, true);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C889738 Verify default sort for MARC authority search (promin)',
      { tags: ['extendedPath', 'promin', 'C889738'] },
      () => {
        searchScenarios.forEach(
          ({ searchOption, allQuery, specificQuery, allOrder, specificOrder }) => {
            [
              { query: allQuery, expectedOrder: allOrder },
              { query: specificQuery, expectedOrder: specificOrder },
            ].forEach(({ query, expectedOrder }) => {
              cy.intercept('GET', '**/search/authorities?limit=**').as('searchAuthorities');
              MarcAuthorities.searchBy(searchOption, query, { isLongValue: true });
              cy.wait('@searchAuthorities').then(({ request }) => {
                const queryParam = new URL(request.url).searchParams.get('query') || '';
                expect(queryParam.toLowerCase()).to.match(/sortby\s+headingref\/sort\.ascending/);
              });
              MarcAuthorities.verifyRecordsInRelativeOrder(expectedOrder);
            });
          },
        );
      },
    );
  });
});
