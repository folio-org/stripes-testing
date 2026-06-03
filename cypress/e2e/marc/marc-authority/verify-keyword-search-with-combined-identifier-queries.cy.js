import { Permissions } from '../../../support/dictionary';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getRandomLetters } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const testData = {
        searchOption: 'Keyword',
        createdAuthorityIDs: [],
        authorityRecords: [
          {
            name: 'Authority A',
            heading: 'C957385 Van Harmelen, Frank',
            lccn: 'n 001234523',
            prefix: 'n',
            tag: '100',
            indicators: ['1', '\\'],
          },
          {
            name: 'Authority B',
            heading: 'C957385 Amending ns',
            lccn: '20042621',
            prefix: '',
            tag: '100',
            indicators: ['1', '\\'],
          },
          {
            name: 'Authority C',
            heading: 'C957385 Ns Company',
            lccn: 'ns 20042621',
            prefix: 'ns',
            tag: '100',
            indicators: ['1', '\\'],
          },
        ],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C957385');

        testData.authorityRecords.forEach((record) => {
          const naturalId = record.prefix
            ? `${record.prefix}${getRandomLetters(10)}`
            : getRandomLetters(12);

          const fields = [
            {
              tag: '010',
              content: `$a ${record.lccn}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: record.tag,
              content: `$a ${record.heading}`,
              indicators: record.indicators,
            },
          ];

          MarcAuthorities.createMarcAuthorityViaAPI(record.prefix || '', naturalId, fields).then(
            (authorityId) => {
              testData.createdAuthorityIDs.push(authorityId);
            },
          );
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        testData.createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C957385 Verify keyword search behavior with identifiers using combined search queries (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C957385'] },
        () => {
          // Step 1: Search with combined heading + identifier query - should not find Authority A
          MarcAuthorities.searchBy(testData.searchOption, 'Harmelen, Frank n 001234523');
          MarcAuthorities.checkRowsCount(0);
          MarcAuthorities.clickResetAndCheck('Harmelen, Frank n 001234523');

          // Step 2: Search by exact identifier - should find only Authority C
          MarcAuthorities.searchBy(testData.searchOption, 'ns20042621');
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.checkAfterSearch('Authorized', testData.authorityRecords[2].heading);
          MarcAuthorities.clickResetAndCheck('ns20042621');

          // Step 3: Search by identifier only - should find Authority A
          MarcAuthorities.searchBy(testData.searchOption, 'n 001234523');
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.checkAfterSearch('Authorized', testData.authorityRecords[0].heading);
          MarcAuthorities.clickResetAndCheck('n 001234523');

          // Step 4: Search by identifier only - should find only Authority B
          MarcAuthorities.searchBy(testData.searchOption, '20042621');
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.checkAfterSearch('Authorized', testData.authorityRecords[1].heading);
          MarcAuthorities.clickResetAndCheck('20042621');

          // Step 5: Search by heading only - should find only Authority C
          MarcAuthorities.searchBy(testData.searchOption, 'Ns Company');
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.checkAfterSearch('Authorized', testData.authorityRecords[2].heading);
        },
      );
    });
  });
});
