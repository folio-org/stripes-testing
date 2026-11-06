import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Browse', () => {
      const randomPostfix = getRandomPostfix();

      const sourceFile = {
        // 15 uppercase letters — unique code required by the API
        code: getRandomLetters(15).toUpperCase(),
        name: `AT_C350547_SourceFile_${randomPostfix}`,
        id: null,
      };

      const testData = {
        headings: [
          `AT_C350547_MarcAuthority_1_${randomPostfix}`,
          `AT_C350547_MarcAuthority_2_${randomPostfix}`,
          `AT_C350547_MarcAuthority_3_${randomPostfix}`,
        ],
      };

      const authorityIds = [];
      let user;

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C350547_');

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
          .then((userProps) => {
            user = userProps;
          })
          .then(() => {
            cy.createAuthoritySourceFileUsingAPI(sourceFile.code, 1, sourceFile.name, false).then(
              (id) => {
                sourceFile.id = id;
                // Wait for mod-source-record-manager mapping cache to include this source file;
                // records created while the cache is stale get an empty sourceFileId forever
                cy.getAdminToken(false);
                cy.waitForAuthoritySourceFileInMappingViaAPI(sourceFile.id);
                cy.getAdminToken(false);

                testData.headings.forEach((heading, idx) => {
                  MarcAuthorities.createMarcAuthorityViaAPI(sourceFile.code, `350547${idx + 1}`, [
                    {
                      tag: '100',
                      content: `$a ${heading}`,
                      indicators: ['1', '\\'],
                    },
                  ]).then((authorityId) => {
                    authorityIds[idx] = authorityId;
                  });
                });
              },
            );
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        Users.deleteViaApi(user.userId);
        // Delete records before deleting the source file
        authorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
        cy.deleteAuthoritySourceFileViaAPI(sourceFile.id, true);
      });

      it(
        'C350547 Verify browse result form when there are less than 1 page with results (promin)',
        { tags: ['extendedPath', 'promin', 'C350547'] },
        () => {
          // Steps 1-3: switch to Browse, select Personal name, search near own records
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorityBrowse.searchBy(
            MarcAuthorityBrowse.searchOptions.personalName.option,
            testData.headings[0],
          );
          MarcAuthorityBrowse.checkPresentedColumns();

          // Step 4: apply "Authority source" filter for the own source file — reduces result
          // to only the 3 created records (< 100) so both pagination buttons are disabled
          MarcAuthorities.chooseAuthoritySourceOption(sourceFile.name);
          MarcAuthorities.waitResultsLoading();
          MarcAuthorities.checkRowsCount(testData.headings.length);

          MarcAuthorities.checkNextPaginationButtonEnabled(false);
          MarcAuthorities.checkPreviousPaginationButtonEnabled(false);
        },
      );
    });
  });
});
