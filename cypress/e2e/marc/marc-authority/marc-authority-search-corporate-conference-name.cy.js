import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const authorityFile = 'marcAuthFileC409445.mrc';
const searchOption = 'Corporate/Conference name';
const searchCases = [
  // Step 3: All headings
  {
    query: 'AT_C409445',
    expected: [
      { authRef: 'Authorized', heading: 'AT_C409445 Corporate name 110', type: 'Corporate Name' },
      { authRef: 'Reference', heading: 'AT_C409445 Corporate name 410', type: 'Corporate Name' },
      { authRef: 'Auth/Ref', heading: 'AT_C409445 Corporate name 510', type: 'Corporate Name' },
      { authRef: 'Authorized', heading: 'AT_C409445 Conference Name 111', type: 'Conference Name' },
      { authRef: 'Reference', heading: 'AT_C409445 Conference Name 411', type: 'Conference Name' },
      { authRef: 'Auth/Ref', heading: 'AT_C409445 Conference Name 511', type: 'Conference Name' },
    ],
  },
  // Step 4: Only Authorized Corporate Name
  {
    query:
      'AT_C409445 Corporate name 110 Apple & Honey Productions subb subc subd subg subn--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Authorized',
        heading:
          'AT_C409445 Corporate name 110 Apple & Honey Productions subb subc subd subg subn--subv--subx--suby--subz',
        type: 'Corporate Name',
      },
    ],
  },
  // Step 5: Only Reference Corporate Name
  {
    query:
      'AT_C409445 Corporate name 410 Apple and Honey Productions subb subc subd subg subn--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Reference',
        heading:
          'AT_C409445 Corporate name 410 Apple and Honey Productions subb subc subd subg subn--subv--subx--suby--subz',
        type: 'Corporate Name',
      },
    ],
  },
  // Step 6: Only Auth/Ref Corporate Name
  {
    query:
      'AT_C409445 Corporate name 510 Apple & Honey Film Corp. subb subc subd subg subn--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Auth/Ref',
        heading:
          'AT_C409445 Corporate name 510 Apple & Honey Film Corp. subb subc subd subg subn--subv--subx--suby--subz',
        type: 'Corporate Name',
      },
    ],
  },
  // Step 7: Only Authorized Conference Name
  {
    query:
      'AT_C409445 Conference Name 111 Western Region Agricultural Education Research Meeting subc subd subn subq subg--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Authorized',
        heading:
          'AT_C409445 Conference Name 111 Western Region Agricultural Education Research Meeting subc subd subn subq subg--subv--subx--suby--subz',
        type: 'Conference Name',
      },
    ],
  },
  // Step 8: Only Reference Conference Name
  {
    query:
      'AT_C409445 Conference Name 411 Western Regional Agricultural Education Research Meeting subc subd subn subq subg--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Reference',
        heading:
          'AT_C409445 Conference Name 411 Western Regional Agricultural Education Research Meeting subc subd subn subq subg--subv--subx--suby--subz',
        type: 'Conference Name',
      },
    ],
  },
  // Step 9: Only Auth/Ref Conference Name
  {
    query:
      'AT_C409445 Conference Name 511 Western Region Agricultural Education Research Seminar (1983-) subc subd subn subq subg--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Auth/Ref',
        heading:
          'AT_C409445 Conference Name 511 Western Region Agricultural Education Research Seminar (1983- ) subc subd subn subq subg--subv--subx--suby--subz',
        type: 'Conference Name',
      },
    ],
  },
  // Step 10-15: Negative cases (no records)
  {
    query:
      'AT_C409445 Corporate name 110 Apple & Honey Productions subb subc subd subg subn subk--subv--subx--suby--subz',
    expected: [],
  },
  {
    query:
      'AT_C409445 Corporate name 410 Apple and Honey Productions subb subc subd subg subn subk--subv--subx--suby--subz',
    expected: [],
  },
  {
    query:
      'AT_C409445 Corporate name 510 Apple & Honey Film Corp. subb subc subd subg subn subk--subv--subx--suby--subz',
    expected: [],
  },
  {
    query:
      'AT_C409445 Conference Name 111 Western Region Agricultural Education Research Meeting subc subd subn subq subg subk--subv--subx--suby--subz',
    expected: [],
  },
  {
    query:
      'AT_C409445 Conference Name 411 Western Regional Agricultural Education Research Meeting subc subd subn subq subg subk--subv--subx--suby--subz',
    expected: [],
  },
  {
    query:
      'AT_C409445 Conference Name 511 Western Region Agricultural Education Research Seminar (1983- ) subc subd subn subq--subv--subx--suby--subz subg',
    expected: [],
  },
];

describe('MARC', () => {
  describe('MARC Authority', () => {
    const createdAuthorityIds = [];
    let user;

    before('Create data, user', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C409445*');
      DataImport.uploadFileViaApi(
        authorityFile,
        `${authorityFile.split('.')[0]}.${getRandomPostfix()}.mrc`,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      ).then((response) => {
        response.forEach((record) => {
          createdAuthorityIds.push(record.authority.id);
        });
      });
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUser) => {
          user = createdUser;
          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        },
      );
    });

    after('Delete data, user', () => {
      cy.getAdminToken();
      createdAuthorityIds.forEach((createdAuthorityId) => {
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C409445 Search for MARC authority records using "Corporate/Conference name" search option (spitfire)',
      { tags: ['criticalPath', 'C409445', 'spitfire'] },
      () => {
        // Step 1: Select Corporate/Conference name search option
        MarcAuthorities.selectSearchOptionInDropdown(searchOption);
        MarcAuthoritiesSearch.verifySelectedSearchOption(searchOption);
        cy.wait(2000);

        searchCases.forEach(({ query, expected }) => {
          MarcAuthorities.searchBeats(query);
          if (expected.length === 0) {
            MarcAuthorities.verifyEmptySearchResults(query);
          } else {
            expected.forEach(({ authRef, heading, type }) => {
              MarcAuthorities.verifyResultsRowContent(heading, type, authRef);
            });
            MarcAuthorities.checkRowsCount(expected.length);
          }
        });
      },
    );
  });
});
