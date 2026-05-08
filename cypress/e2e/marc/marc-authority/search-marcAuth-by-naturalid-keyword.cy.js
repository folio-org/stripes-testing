import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS, AUTHORITY_TYPES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = `422174${randomNDigitNumber(15)}`;
      const testData = {
        tag001: '001',
        tag010: '010',
        tag100: '100',
        authorityHeadingPrefix: `AT_C422174_MarcAuthority_${randomPostfix}`,
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
        authorizedType: AUTHORITY_TYPES.AUTHORIZED,
      };

      const authorityRecords = [
        {
          heading: `${testData.authorityHeadingPrefix} 1`,
          field010: `n  ${randomDigits}1`, // LCCN with spaces
          field001: `${randomDigits}2`, // Separate numeric ID
        },
        {
          heading: `${testData.authorityHeadingPrefix} 2`,
          field010: `n${randomDigits}3`, // LCCN without space after prefix
          field001: `${randomDigits}4`, // Separate numeric ID
        },
        {
          heading: `${testData.authorityHeadingPrefix} 3`,
          field001: `n  ${randomDigits}5`, // LCCN in 001 (no 010 field)
        },
      ];

      const searchData = [
        {
          query: `n${randomDigits}1`, // Normalized from 010 $a with spaces
          expectedRecord: authorityRecords[0],
        },
        {
          query: `n${randomDigits}3`, // Normalized from 010 $a without space
          expectedRecord: authorityRecords[1],
        },
        {
          query: `n${randomDigits}5`, // Normalized from 001 (no 010 field)
          expectedRecord: authorityRecords[2],
        },
        {
          query: `n  ${randomDigits}1`, // Exact 010 $a value with spaces
          expectedRecord: authorityRecords[0],
        },
        {
          query: `n  ${randomDigits}5`, // Exact 001 value with spaces
          expectedRecord: authorityRecords[2],
        },
      ];

      const createdAuthorityIds = [];

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422174');

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
          .then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            authorityRecords.forEach((recordData) => {
              const marcAuthorityFields = [
                {
                  tag: testData.tag100,
                  content: `$a ${recordData.heading}`,
                  indicators: ['1', '\\'],
                },
              ];

              // Add 010 field only if defined
              if (recordData.field010) {
                marcAuthorityFields.unshift({
                  tag: testData.tag010,
                  content: `$a ${recordData.field010}`,
                  indicators: ['\\', '\\'],
                });
              }

              MarcAuthorities.createMarcAuthorityViaAPI(
                recordData.field001,
                '',
                marcAuthorityFields,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });
            });
          })
          .then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdAuthorityIds.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C422174 Search MARC: support search for "naturalId" field using "Keyword" search option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C422174'] },
        () => {
          searchData.forEach((search) => {
            MarcAuthorities.searchByParameter(testData.searchOption, search.query);
            // Verify expected record is found
            MarcAuthorities.verifyRecordFound(search.expectedRecord.heading);
            // Verify other records from our test are NOT found
            const otherRecords = authorityRecords.filter(
              (record) => record.heading !== search.expectedRecord.heading,
            );
            otherRecords.forEach((record) => {
              MarcAuthorities.verifyRecordFound(record.heading, false);
            });
          });
        },
      );
    });
  });
});
