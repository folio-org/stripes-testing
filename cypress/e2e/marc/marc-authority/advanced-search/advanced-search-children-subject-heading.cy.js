import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
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
      const testData = {
        marcFile: {
          marc: 'C422184MarcAuth.mrc',
          fileName: `C422184 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
        searchQueries: ['sj  2018050004422184', 'sj2021056711422184', 'sj2021053664'],
        searchOption: "Children's subject heading",
        expectedResults: [
          'C422184 Piano music',
          'C422184 María de Jesús, de Agreda, sister, 1602-1665',
          'C422184 Montessori method of education',
        ],
      };
      const createdAuthorityIDs = [];

      before(() => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422184*');
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
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C422184 Advanced search MARC: support search for "naturalId" field using "Children subject heading" search option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C422184'] },
        () => {
          MarcAuthorities.clickAdvancedSearchButton();

          MarcAuthorities.fillAdvancedSearchField(
            0,
            testData.searchQueries[0],
            testData.searchOption,
          );
          MarcAuthorities.fillAdvancedSearchField(
            1,
            testData.searchQueries[1],
            testData.searchOption,
            'OR',
          );
          MarcAuthorities.fillAdvancedSearchField(
            2,
            testData.searchQueries[2],
            testData.searchOption,
            'OR',
          );

          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();
          MarcAuthorities.checkResultList(testData.expectedResults);
        },
      );
    });
  });
});
