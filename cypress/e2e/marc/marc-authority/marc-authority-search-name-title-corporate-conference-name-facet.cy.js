import { including } from '@interactors/html';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const authorityFile = 'marcAuthFileC409444.mrc';
const searchQuery = 'AT_C409444';
const corpConfOptionName = 'Corporate/Conference name';
const nameTitleOptionName = 'Name-title';
const corporateNameTypeName = 'Corporate Name';
const conferenceNameTypeName = 'Conference Name';
const personalNameTypeName = 'Personal Name';

const corporateConferenceResults = [
  'AT_C409444 Conference Name 111',
  'AT_C409444 Conference Name 411',
  'AT_C409444 Conference Name 511',
  'AT_C409444 Corporate name 110',
  'AT_C409444 Corporate name 410',
  'AT_C409444 Corporate name 510',
];
const conferenceOnlyResults = [
  'AT_C409444 Conference Name 111',
  'AT_C409444 Conference Name 411',
  'AT_C409444 Conference Name 511',
];
const corporateOnlyResults = [
  'AT_C409444 Corporate name 110',
  'AT_C409444 Corporate name 410',
  'AT_C409444 Corporate name 510',
];
const nameTitleResults = [
  'AT_C409444 Personal name-title 100',
  'AT_C409444 Personal name-title 400',
  'AT_C409444 Personal name-title 500',
  'AT_C409444 Corporate name-title 110',
  'AT_C409444 Corporate name-title 410',
  'AT_C409444 Corporate name-title 510',
  'AT_C409444 Conference Name-title 111',
  'AT_C409444 Conference Name-title 411',
  'AT_C409444 Conference Name-title 511',
];
const nameTitlePersonalResults = [
  'AT_C409444 Personal name-title 100',
  'AT_C409444 Personal name-title 400',
  'AT_C409444 Personal name-title 500',
];
const nameTitleCorporateResults = [
  'AT_C409444 Corporate name-title 110',
  'AT_C409444 Corporate name-title 410',
  'AT_C409444 Corporate name-title 510',
];
const nameTitleConferenceResults = [
  'AT_C409444 Conference Name-title 111',
  'AT_C409444 Conference Name-title 411',
  'AT_C409444 Conference Name-title 511',
];

describe('MARC', () => {
  describe('MARC Authority', () => {
    const createdAuthorityIds = [];
    let user;

    before('Create data, user', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(searchQuery);
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
      'C409444 Searching MARC authority records using "Corporate/Conference name", "Name-title" search options and "Type of heading" facet (spitfire)',
      { tags: ['criticalPath', 'C409444', 'spitfire'] },
      () => {
        // Step 1-3: Search with "Corporate/Conference name"
        MarcAuthorities.selectSearchOptionInDropdown(corpConfOptionName);
        MarcAuthoritiesSearch.verifySelectedSearchOption(corpConfOptionName);
        MarcAuthorities.searchBeats(searchQuery);
        MarcAuthorities.checkResultList(
          corporateConferenceResults.map((heading) => including(heading)),
        );
        MarcAuthorities.checkRowsCount(corporateConferenceResults.length);

        // Step 4: Filter by "Conference Name"
        MarcAuthorities.chooseTypeOfHeading(conferenceNameTypeName);
        MarcAuthorities.checkResultList(conferenceOnlyResults.map((heading) => including(heading)));
        MarcAuthorities.checkRowsCount(conferenceOnlyResults.length);

        // Step 5: Reset filter
        MarcAuthorities.resetTypeOfHeading();
        MarcAuthorities.checkResultList(
          corporateConferenceResults.map((heading) => including(heading)),
        );
        MarcAuthorities.checkRowsCount(corporateConferenceResults.length);

        // Step 6: Filter by "Corporate Name"
        MarcAuthorities.chooseTypeOfHeading(corporateNameTypeName);
        MarcAuthorities.checkResultList(corporateOnlyResults.map((heading) => including(heading)));
        MarcAuthorities.checkRowsCount(corporateOnlyResults.length);

        // Step 7: Reset filter
        MarcAuthorities.resetTypeOfHeading();
        MarcAuthorities.checkResultList(
          corporateConferenceResults.map((heading) => including(heading)),
        );
        MarcAuthorities.checkRowsCount(corporateConferenceResults.length);

        // Step 8-9: Search with "Name-title"
        MarcAuthorities.selectSearchOptionInDropdown(nameTitleOptionName);
        MarcAuthoritiesSearch.verifySelectedSearchOption(nameTitleOptionName);
        MarcAuthorities.searchBeats(searchQuery);
        MarcAuthorities.checkResultList(nameTitleResults.map((heading) => including(heading)));
        MarcAuthorities.checkRowsCount(nameTitleResults.length);

        // Step 10: Filter by "Personal Name"
        MarcAuthorities.chooseTypeOfHeading(personalNameTypeName);
        MarcAuthorities.checkResultList(
          nameTitlePersonalResults.map((heading) => including(heading)),
        );
        MarcAuthorities.checkRowsCount(nameTitlePersonalResults.length);

        // Step 11: Reset filter
        MarcAuthorities.resetTypeOfHeading();
        MarcAuthorities.checkResultList(nameTitleResults.map((heading) => including(heading)));
        MarcAuthorities.checkRowsCount(nameTitleResults.length);

        // Step 12: Filter by "Corporate Name"
        MarcAuthorities.chooseTypeOfHeading(corporateNameTypeName);
        MarcAuthorities.checkResultList(
          nameTitleCorporateResults.map((heading) => including(heading)),
        );
        MarcAuthorities.checkRowsCount(nameTitleCorporateResults.length);

        // Step 13: Reset filter
        MarcAuthorities.resetTypeOfHeading();
        MarcAuthorities.checkResultList(nameTitleResults.map((heading) => including(heading)));
        MarcAuthorities.checkRowsCount(nameTitleResults.length);

        // Step 14: Filter by "Conference Name"
        MarcAuthorities.chooseTypeOfHeading(conferenceNameTypeName);
        MarcAuthorities.checkResultList(
          nameTitleConferenceResults.map((heading) => including(heading)),
        );
        MarcAuthorities.checkRowsCount(nameTitleConferenceResults.length);

        // Step 15: Reset filter
        MarcAuthorities.resetTypeOfHeading();
        MarcAuthorities.checkResultList(nameTitleResults.map((heading) => including(heading)));
        MarcAuthorities.checkRowsCount(nameTitleResults.length);
      },
    );
  });
});
