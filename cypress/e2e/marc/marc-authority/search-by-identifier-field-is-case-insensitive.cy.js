import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const keywordSearchOption = 'Keyword';
    const identifierAllSearchOption = 'Identifier (all)';
    const searchQueries = ['np13011996', 'NP13011996'];
    const searchResults = [
      'C466085 Authority 1, 001 identifier lower case test',
      'C466085 Authority 2, 001 identifier UPPER case test',
      'C466085 Authority 3, 010 identifier lower case test',
      'C466085 Authority 4, 010 identifier UPPER case test',
      'C466085 Authority 5, 024 identifier lower case test',
      'C466085 Authority 6, 024 identifier UPPER case test',
      'C466085 Authority 7, 035 identifier lower case test',
      'C466085 Authority 8, 035 identifier UPPER case test',
    ];
    // create an array of file names
    const mrkFiles = Array.from({ length: 8 }, (_, i) => `marcAuthFileForC466085_${i + 1}.mrk`);
    const createdAuthorityIDs = [];
    let user;

    before('Create user, test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C466085*');

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;

        mrkFiles.forEach((mrkFile) => {
          MarcAuthorities.createMarcAuthorityRecordViaApiByReadingFromMrkFile(mrkFile).then(
            (createdMarcBibliographicId) => {
              createdAuthorityIDs.push(createdMarcBibliographicId);
            },
          );
          cy.wait(2000);
        });
        cy.wait(2000);

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

    it(
      'C466085 Search by "Identifier" field is case-insensitive (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466085'] },
      () => {
        searchQueries.forEach((query) => {
          MarcAuthorities.searchByParameter(keywordSearchOption, query);
          cy.wait(1000);
          searchResults.forEach((result) => {
            MarcAuthorities.checkAfterSearch('Authorized', result);
          });
          MarcAuthorities.clickResetAndCheck(query);
          cy.wait(500);
        });

        searchQueries.forEach((query) => {
          MarcAuthorities.searchByParameter(identifierAllSearchOption, query);
          cy.wait(1000);
          searchResults.forEach((result) => {
            MarcAuthorities.checkAfterSearch('Authorized', result);
          });
          MarcAuthorities.clickResetAndCheck(query);
          cy.wait(500);
        });
      },
    );
  });
});
