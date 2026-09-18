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
    const lccnValueA = `n${naturalIdPrefix}11`;
    const lccnValueB = `n${naturalIdPrefix}22`;

    // 2 records per type-scoped search option: "Alpha" (found only by "*") and "Beta" (found by
    // "*" too, and used as the option's specific-query target via its own full heading - since
    // every heading already starts with the per-run-random titlePrefix, that alone guarantees no
    // collision with leftover/parallel-run data, no separate random marker needed on top of it.
    // "personalNameA"/"personalNameB" (the two identifier-bearing ones) double up to cover
    // "LCCN"/"Identifier (all)" too, since those aren't a distinct heading type of their own.
    const personalNameA = {
      tag: '100',
      indicators: ['1', '\\'],
      heading: `${titlePrefix} Personal Name Alpha`,
    };
    const personalNameB = {
      tag: '100',
      indicators: ['1', '\\'],
      heading: `${titlePrefix} Personal Name Beta`,
      lccn: lccnValueA,
    };
    const corporateNameA = {
      tag: '110',
      indicators: ['2', '\\'],
      heading: `${titlePrefix} Corporate Name Alpha`,
    };
    const corporateNameB = {
      tag: '111',
      indicators: ['2', '\\'],
      heading: `${titlePrefix} Conference Name Beta`,
    };
    const geographicNameA = {
      tag: '151',
      indicators: ['\\', '\\'],
      heading: `${titlePrefix} Geographic Name Alpha`,
    };
    const geographicNameB = {
      tag: '151',
      indicators: ['\\', '\\'],
      heading: `${titlePrefix} Geographic Name Beta`,
    };
    const nameTitleA = {
      tag: '100',
      indicators: ['1', '\\'],
      heading: `${titlePrefix} Name Title Alpha`,
      hasTitle: true,
    };
    const nameTitleB = {
      tag: '100',
      indicators: ['1', '\\'],
      heading: `${titlePrefix} Name Title Beta`,
      hasTitle: true,
    };
    const uniformTitleA = {
      tag: '130',
      indicators: ['0', '\\'],
      heading: `${titlePrefix} Uniform Title Alpha`,
    };
    const uniformTitleB = {
      tag: '130',
      indicators: ['0', '\\'],
      heading: `${titlePrefix} Uniform Title Beta`,
    };
    const subjectA = {
      tag: '150',
      indicators: ['\\', '0'],
      heading: `${titlePrefix} Subject Alpha`,
      lccn: lccnValueB,
    };
    const subjectB = {
      tag: '150',
      indicators: ['\\', '0'],
      heading: `${titlePrefix} Subject Beta`,
    };
    // The "Children's subject heading" distinction comes from the 008 "SH Sys" byte, not the
    // 150 field's own indicators - those stay blank, same as a plain LCSH subject
    const childrensSubjectA = {
      tag: '150',
      indicators: ['\\', '\\'],
      heading: `${titlePrefix} Childrens Subject Alpha`,
      isChildrens: true,
    };
    const childrensSubjectB = {
      tag: '150',
      indicators: ['\\', '\\'],
      heading: `${titlePrefix} Childrens Subject Beta`,
      isChildrens: true,
    };
    const genreA = { tag: '155', indicators: ['\\', '\\'], heading: `${titlePrefix} Genre Alpha` };
    const genreB = {
      tag: '155',
      indicators: ['\\', '\\'],
      heading: `${titlePrefix} Genre Beta`,
    };

    const allRecords = [
      personalNameA,
      personalNameB,
      corporateNameA,
      corporateNameB,
      geographicNameA,
      geographicNameB,
      nameTitleA,
      nameTitleB,
      uniformTitleA,
      uniformTitleB,
      subjectA,
      subjectB,
      childrensSubjectA,
      childrensSubjectB,
      genreA,
      genreB,
    ];

    // Per search option: the "*" (show all) query, and a specific query returning fewer records
    const searchScenarios = [
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
        allQuery: '*',
        specificQuery: personalNameB.heading,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.IDENTIFIER_ALL,
        allQuery: '*',
        specificQuery: lccnValueA,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.LCCN,
        allQuery: '*',
        specificQuery: lccnValueA,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
        allQuery: '*',
        specificQuery: personalNameB.heading,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.CORPORATE_CONFERENCE_NAME,
        allQuery: '*',
        specificQuery: corporateNameB.heading,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.GEOGRAPHIC_NAME,
        allQuery: '*',
        specificQuery: geographicNameB.heading,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.NAME_TITLE,
        allQuery: '*',
        specificQuery: nameTitleB.heading,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.UNIFORM_TITLE,
        allQuery: '*',
        specificQuery: uniformTitleB.heading,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.SUBJECT,
        allQuery: '*',
        specificQuery: subjectB.heading,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.CHILDRENS_SUBJECT_HEADING,
        allQuery: '*',
        specificQuery: childrensSubjectB.heading,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.GENRE,
        allQuery: '*',
        specificQuery: genreB.heading,
      },
      {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.ADVANCED_SEARCH,
        allQuery: 'keyword containsAll *',
        specificQuery: `keyword containsAll ${personalNameA.heading}`,
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

      allRecords.forEach(createAuthority);

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
        searchScenarios.forEach(({ searchOption, allQuery, specificQuery }) => {
          [allQuery, specificQuery].forEach((query) => {
            cy.intercept('GET', '**/search/authorities?limit=**').as('searchAuthorities');
            MarcAuthorities.searchBy(searchOption, query);
            cy.wait('@searchAuthorities').then(({ request }) => {
              const queryParam = new URL(request.url).searchParams.get('query') || '';
              expect(queryParam.toLowerCase()).to.match(/sortby\s+headingref\/sort\.ascending/);
            });
            MarcAuthorities.checkResultsSortedWithDiacriticFolding();
          });
        });
      },
    );
  });
});
