import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = [
      {
        id: 'C466086',
        searchOption: 'Personal name',
        titles: ['C466086 PERSONAL NAME CASE TEST', 'C466086 personal name case test'],
      },
      {
        id: 'C466087',
        searchOption: 'Corporate/Conference name',
        titles: ['C466087 CORPORATE NAME CASE TEST', 'C466087 corporate name case test'],
      },
      {
        id: 'C466088',
        searchOption: 'Geographic name',
        titles: ['C466088 GEOGRAPHIC NAME CASE TEST', 'C466088 geographic name case test'],
      },
      {
        id: 'C466089',
        searchOption: 'Name-title',
        titles: ['C466089 NAME-TITLE CASE TEST', 'C466089 name-title case test'],
      },
      {
        id: 'C466090',
        searchOption: 'Uniform title',
        titles: ['C466090 UNIFORM TITLE CASE TEST', 'C466090 uniform title case test'],
      },
      {
        id: 'C466091',
        searchOption: 'Subject',
        titles: ['C466091 SUBJECT CASE TEST', 'C466091 subject case test'],
      },
      {
        id: 'C466092',
        searchOption: 'Genre',
        titles: ['C466092 GENRE CASE TEST', 'C466092 genre case test'],
      },
    ];
    const keywordSearchOption = 'Keyword';
    const marcFiles = [
      {
        marc: 'marcAuthFileForC466086-C466092.mrc',
        fileName: `C466086testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      },
    ];
    const createdAuthorityIDs = [];
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      testData.forEach(({ id }) => {
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(`${id}`);
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;

        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityIDs.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
        MarcAuthorities.switchToSearch();
      });
    });

    after('Delete user, test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      createdAuthorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    testData.forEach((test) => {
      it(
        `C466086 C466087 C466088 C466089 C466090 C466091 C466092 Search/Browse by "${test.searchOption}" field is case-insensitive (spitfire)`,
        { tags: ['criticalPath', 'spitfire', test.id] },
        () => {
          // execute search by "Keyword" option
          test.titles.forEach((query) => {
            MarcAuthorities.searchByParameter(keywordSearchOption, query);
            cy.wait(1000);

            test.titles.forEach((expected) => {
              MarcAuthorities.checkAfterSearch('Authorized', expected);
            });
            MarcAuthorities.clickResetAndCheck(query);
            cy.wait(500);
          });

          // execute search by specific option
          test.titles.forEach((query) => {
            MarcAuthorities.searchByParameter(test.searchOption, query);
            cy.wait(1000);

            test.titles.forEach((expected) => {
              MarcAuthorities.checkAfterSearch('Authorized', expected);
            });

            MarcAuthorities.clickResetAndCheck(query);
            cy.wait(500);
          });

          // Check Browse mode:
          MarcAuthorities.switchToBrowse();

          test.titles.forEach((query) => {
            MarcAuthorities.searchByParameter(test.searchOption, query);
            cy.wait(1000);
            test.titles.forEach((expected) => {
              MarcAuthorities.checkAfterSearch('Authorized', expected);
            });

            MarcAuthorities.clickReset();
            MarcAuthorities.checkRecordsResultListIsAbsent();
            MarcAuthorities.switchToSearch();
          });
        },
      );
    });
  });
});
