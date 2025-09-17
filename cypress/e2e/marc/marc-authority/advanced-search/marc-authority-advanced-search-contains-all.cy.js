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
        personalNameOption: 'Personal name',
        nameTitleOption: 'Name-title',
        personalNameType: 'Personal Name',
        keywordOption: 'Keyword',
        containsAllMatchOption: 'Contains all',
      };

      const searchData = [
        {
          query: 'Jack, Adrienne',
          searchOption: testData.personalNameOption,
          operator: false,
        },
        {
          query: 'Adrian, George',
          searchOption: testData.personalNameOption,
          operator: 'OR',
        },
        {
          query: 'Steig, William',
          searchOption: testData.nameTitleOption,
          operator: 'OR',
        },

        {
          query: 'Third',
          searchOption: testData.keywordOption,
          operator: false,
        },
        {
          query: 'Shrek',
          searchOption: testData.nameTitleOption,
          operator: 'NOT',
        },
      ];

      const searchResults = [
        [
          {
            type: 'Reference',
            heading: 'Jack, Michael Adrienne',
          },
          {
            type: 'Authorized',
            heading: 'Jack, Adrienne',
          },
          {
            type: 'Authorized',
            heading: 'Adrienne, Jack, M.',
          },
          {
            type: 'Auth/Ref',
            heading: 'Amanda, Adrienne, Michaela, Jack, Third',
          },
        ],
        [
          {
            type: 'Reference',
            heading: 'Jack, Michael Adrienne',
          },
          {
            type: 'Authorized',
            heading: 'Jack, Adrienne',
          },
          {
            type: 'Authorized',
            heading: 'Adrian, George',
          },
          {
            type: 'Authorized',
            heading: 'Adrienne, Jack, M.',
          },
          {
            type: 'Auth/Ref',
            heading: 'George, W., Adrian',
          },
          {
            type: 'Auth/Ref',
            heading: 'Amanda, Adrienne, Michaela, Jack, Third',
          },
          {
            type: 'Auth/Ref',
            heading: 'Adrian, The Third - George W.',
          },
        ],
        [
          {
            type: 'Reference',
            heading: 'Jack, Michael Adrienne',
          },
          {
            type: 'Authorized',
            heading: 'Jack, Adrienne',
          },
          {
            type: 'Authorized',
            heading: 'Adrian, George',
          },
          {
            type: 'Authorized',
            heading: 'Adrienne, Jack, M.',
          },
          {
            type: 'Auth/Ref',
            heading: 'George, W., Adrian',
          },
          {
            type: 'Auth/Ref',
            heading: 'Amanda, Adrienne, Michaela, Jack, Third',
          },
          {
            type: 'Auth/Ref',
            heading: 'Adrian, The Third - George W.',
          },
          {
            type: 'Reference',
            heading: 'William, W. Steig, Shrek: "The third"',
          },
          {
            type: 'Authorized',
            heading: 'Steig, William, 1907-2003. Shrek!',
          },
          {
            type: 'Authorized',
            heading: 'S.William, 1907-2003. Gorky rises (Steig), . Chinese',
          },
          {
            type: 'Auth/Ref',
            heading: 'Geji fei tian ji 1907-2003. Steig, (third) William',
          },
        ],
        [
          {
            type: 'Auth/Ref',
            heading: 'Amanda, Adrienne, Michaela, Jack, Third',
          },
          {
            type: 'Auth/Ref',
            heading: 'Adrian, The Third - George W.',
          },
          {
            type: 'Reference',
            heading: 'William, W. Steig, Shrek: "The third"',
          },
          {
            type: 'Auth/Ref',
            heading: 'Geji fei tian ji 1907-2003. Steig, (third) William',
          },
        ],
        [
          {
            type: 'Auth/Ref',
            heading: 'Amanda, Adrienne, Michaela, Jack, Third',
          },
          {
            type: 'Auth/Ref',
            heading: 'Adrian, The Third - George W.',
          },
          {
            type: 'Auth/Ref',
            heading: 'Geji fei tian ji 1907-2003. Steig, (third) William',
          },
        ],
      ];

      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const marcFile = {
        marc: 'marcAuthFileC407722.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        numOfRecords: 8,
        propertyName: 'authority',
      };

      const createdAuthorityIDs = [];

      before(() => {
        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties) => {
            testData.userProperties = createdUserProperties;
          },
        );
        searchResults.forEach((resultArray) => {
          resultArray.forEach((result) => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: `keyword="${result.heading}"`,
            }).then((records) => {
              records.forEach((record) => {
                MarcAuthority.deleteViaAPI(record.id, true);
              });
            });
          });
        });

        DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
          (response) => {
            response.forEach((record) => {
              createdAuthorityIDs.push(record[marcFile.propertyName].id);
            });
          },
        );
      });

      beforeEach(() => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
          authRefresh: true,
        });
      });

      after(() => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C407722 Advanced search of "MARC authority" records using "Contains all" search operator (Personal name and Name-title) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C407722'] },
        () => {
          cy.ifConsortia(true, () => {
            MarcAuthorities.clickAccordionByName('Shared');
            MarcAuthorities.actionsSelectCheckbox('No');
          });
          searchData.forEach((search, index) => {
            MarcAuthorities.clickAdvancedSearchButton();
            if (!index) {
              MarcAuthorities.checkAdvancedSearchModalFields(
                index,
                '',
                testData.keywordOption,
                search.operator,
                testData.containsAllMatchOption,
              );
            }
            MarcAuthorities.fillAdvancedSearchField(
              index,
              search.query,
              search.searchOption,
              search.operator,
            );
            MarcAuthorities.checkAdvancedSearchModalFields(
              index,
              search.query,
              search.searchOption,
              search.operator,
              testData.containsAllMatchOption,
            );
            MarcAuthorities.clickSearchButton();
            searchResults[index].forEach((result) => {
              MarcAuthorities.verifyResultsRowContent(
                result.heading,
                result.type,
                testData.personalNameType,
              );
            });
          });
        },
      );
    });
  });
});
