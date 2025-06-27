import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
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
        titles: {
          titlePersonalName: 'TestPersonalName',
          titleCorporateName: 'TestCorporate/ConferenceName',
          titleUniform: 'TestUniformTitle',
          titleDefault: '',
        },
        searchOptions: {
          personalName: 'Personal name',
          corporateName: 'Corporate/Conference name',
          uniformTitle: 'Uniform title',
          keyword: 'Keyword',
        },
        booleanOptions: {
          or: 'OR',
          and: 'AND',
        },
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const marcFile = {
        marc: 'MarcAuthorities(Personal,Uniform,Corporate).mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        propertyName: 'authority',
      };

      const createdAuthorityID = [];

      before(() => {
        cy.getAdminToken();
        [
          testData.titles.titlePersonalName,
          testData.titles.titleCorporateName,
          testData.titles.titleUniform,
        ].forEach((title) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(title);
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties) => {
            testData.userProperties = createdUserProperties;
          },
        );

        DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
          (response) => {
            response.forEach((record) => {
              createdAuthorityID.push(record[marcFile.propertyName].id);
            });
          },
        );
      });

      beforeEach(() => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });

      after(() => {
        cy.getAdminToken();
        createdAuthorityID.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C350684 Updating Advanced Search query from modal window (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C350684'] },
        () => {
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.actionsSortBy('Type of heading');

          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.fillAdvancedSearchField(
            0,
            testData.titles.titlePersonalName,
            testData.searchOptions.personalName,
          );
          MarcAuthorities.fillAdvancedSearchField(
            1,
            testData.titles.titleCorporateName,
            testData.searchOptions.corporateName,
            testData.booleanOptions.or,
          );
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkSearchInput(
            `personalNameTitle containsAll ${testData.titles.titlePersonalName} or corporateNameTitle containsAll ${testData.titles.titleCorporateName}`,
          );
          MarcAuthorities.checkRowsContent([
            testData.titles.titleCorporateName,
            testData.titles.titlePersonalName,
          ]);

          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.fillAdvancedSearchField(
            2,
            testData.titles.titleUniform,
            testData.searchOptions.uniformTitle,
            testData.booleanOptions.or,
          );
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkSearchInput(
            `personalNameTitle containsAll ${testData.titles.titlePersonalName} or corporateNameTitle containsAll ${testData.titles.titleCorporateName} or uniformTitle containsAll ${testData.titles.titleUniform}`,
          );
          MarcAuthorities.checkRowsContent([
            testData.titles.titleCorporateName,
            testData.titles.titlePersonalName,
            testData.titles.titleUniform,
          ]);

          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.fillAdvancedSearchField(
            1,
            testData.titles.titleDefault,
            testData.searchOptions.keyword,
            testData.booleanOptions.and,
          );
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkSearchInput(
            `personalNameTitle containsAll ${testData.titles.titlePersonalName} or uniformTitle containsAll ${testData.titles.titleUniform}`,
          );
          MarcAuthorities.checkRowsContent([
            testData.titles.titlePersonalName,
            testData.titles.titleUniform,
          ]);
        },
      );

      it(
        'C350607 Advanced search of MARC authority records (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C350607'] },
        () => {
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.checkAdvancedSearchModalFields(
            0,
            testData.titles.titleDefault,
            testData.searchOptions.keyword,
          );
          MarcAuthorities.fillAdvancedSearchField(
            0,
            testData.titles.titlePersonalName,
            testData.searchOptions.personalName,
          );
          MarcAuthorities.checkAdvancedSearchOption(0);
          MarcAuthorities.fillAdvancedSearchField(
            1,
            testData.titles.titleCorporateName,
            testData.searchOptions.corporateName,
            testData.booleanOptions.or,
          );
          MarcAuthorities.checkAdvancedSearchOption(1);
          MarcAuthorities.fillAdvancedSearchField(
            2,
            testData.titles.titleUniform,
            testData.searchOptions.uniformTitle,
            testData.booleanOptions.or,
          );
          MarcAuthorities.checkAdvancedSearchOption(2);
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkResultList([
            testData.titles.titleCorporateName,
            testData.titles.titlePersonalName,
            testData.titles.titleUniform,
          ]);
          MarcAuthorities.checkSearchInput(
            `personalNameTitle containsAll ${testData.titles.titlePersonalName} or corporateNameTitle containsAll ${testData.titles.titleCorporateName} or uniformTitle containsAll ${testData.titles.titleUniform}`,
          );

          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.checkAdvancedSearchModalFields(
            0,
            testData.titles.titlePersonalName,
            testData.searchOptions.personalName,
          );
          MarcAuthorities.checkAdvancedSearchModalFields(
            1,
            testData.titles.titleCorporateName,
            testData.searchOptions.corporateName,
            testData.booleanOptions.or,
          );
          MarcAuthorities.checkAdvancedSearchModalFields(
            2,
            testData.titles.titleUniform,
            testData.searchOptions.uniformTitle,
            testData.booleanOptions.or,
          );
          MarcAuthorities.clickCancelButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();
          MarcAuthorities.checkResultList([
            testData.titles.titleCorporateName,
            testData.titles.titlePersonalName,
            testData.titles.titleUniform,
          ]);
          MarcAuthorities.checkSearchInput(
            `personalNameTitle containsAll ${testData.titles.titlePersonalName} or corporateNameTitle containsAll ${testData.titles.titleCorporateName} or uniformTitle containsAll ${testData.titles.titleUniform}`,
          );

          MarcAuthorities.searchBy(
            'Advanced search',
            `personalNameTitle containsAll ${testData.titles.titlePersonalName} or corporateNameTitle containsAll ${testData.titles.titleCorporateName}`,
          );
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.checkAdvancedSearchModalFields(
            0,
            testData.titles.titlePersonalName,
            testData.searchOptions.personalName,
          );
          MarcAuthorities.checkAdvancedSearchModalFields(
            1,
            testData.titles.titleCorporateName,
            testData.searchOptions.corporateName,
            testData.booleanOptions.or,
          );
          MarcAuthorities.checkAdvancedSearchModalFields(
            2,
            testData.titles.titleDefault,
            testData.searchOptions.keyword,
            testData.booleanOptions.and,
          );
          MarcAuthorities.fillAdvancedSearchField(
            2,
            testData.titles.titleUniform,
            testData.searchOptions.uniformTitle,
            testData.booleanOptions.or,
          );
          MarcAuthorities.checkAdvancedSearchOption(2);
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkSearchInput(
            `personalNameTitle containsAll ${testData.titles.titlePersonalName} or corporateNameTitle containsAll ${testData.titles.titleCorporateName} or uniformTitle containsAll ${testData.titles.titleUniform}`,
          );

          MarcAuthorities.clickResetAndCheck();
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.checkAdvancedSearchModalFields(
            0,
            testData.titles.titleDefault,
            testData.searchOptions.keyword,
          );
        },
      );
    });
  });
});
