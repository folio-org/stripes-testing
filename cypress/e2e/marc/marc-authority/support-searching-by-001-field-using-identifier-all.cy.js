import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  authorityIDs: [],
  searchOptions: {
    IDENTIFIERS_ALL: 'Identifier (all)',
    KEYWORD: 'Keyword',
  },
  authRows: {
    peterJackson: 'Jackson, Peter, 1950-2022 Inspector Banks series ;',
    warsawCouncil: 'Warsaw Council (2nd : 1962-1965 : Basilica di San Pietro in Warsawo)',
    delawareSymposium:
      'Delaware Symposium on Language Studies. Delaware symposia on language studies 1985',
  },
  authorizedTypes: {
    AUTHORIZED: 'Authorized',
  },
  marcFiles: [
    {
      marc: 'marcAuthC380586_01.mrc',
      fileName: `testMarcFileAuthC380586_01.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
    },
    {
      marc: 'marcAuthC380586_02.mrc',
      fileName: `testMarcFileAuthC380586_02.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
    },
    {
      marc: 'marcAuthC380586_03.mrc',
      fileName: `testMarcFileAuthC380586_03.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
    },
  ],
  identifierQueries: ['01233282023710', '012332820237*', '*93648'],
};

describe('MARC', () => {
  describe('MARC Authority', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
        .then((userProperties) => {
          testData.user = userProperties;

          testData.identifierQueries.forEach((query) => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: `(keyword all "${query}" or identifiers.value=="${query}" or naturalId="${query}")`,
            }).then((authorities) => {
              if (authorities) {
                authorities.forEach(({ id }) => {
                  MarcAuthority.deleteViaAPI(id, true);
                });
              }
            });
          });
        })
        .then(() => {
          testData.marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                testData.authorityIDs.push(record.authority.id);
              });
            });
          });
        })
        .then(() => {
          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            cy.reload();
            MarcAuthorities.waitLoading();
          }, 20_000);
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.authorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C380586 Search MARC: support searching by 001 field value using "Identifier (all) " option (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C380586'] },
      () => {
        MarcAuthorities.checkSearchOptions();
        MarcAuthorities.searchBy(testData.searchOptions.IDENTIFIERS_ALL, '01233282023710');
        cy.ifConsortia(true, () => {
          MarcAuthorities.clickAccordionByName('Shared');
          MarcAuthorities.actionsSelectCheckbox('No');
        });
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.peterJackson,
        );

        MarcAuthorities.selectFirstRecord();
        MarcAuthorities.checkFieldAndContentExistence('001', '01233282023710');

        MarcAuthorities.searchBy(testData.searchOptions.IDENTIFIERS_ALL, '012332820237*');
        MarcAuthorities.checkRowsCount(2);
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.peterJackson,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.warsawCouncil,
        );

        MarcAuthorities.searchBy(testData.searchOptions.IDENTIFIERS_ALL, '*93648');
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.delawareSymposium,
        );

        MarcAuthorities.searchBy(testData.searchOptions.KEYWORD, '01233282023710');
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.peterJackson,
        );

        MarcAuthorities.searchBy(testData.searchOptions.KEYWORD, '012332820237*');
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.peterJackson,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.warsawCouncil,
        );

        MarcAuthorities.searchBy(testData.searchOptions.KEYWORD, '*93648');
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.delawareSymposium,
        );
      },
    );
  });
});
