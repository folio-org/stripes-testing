import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search - Authority records', () => {
      const testData = {
        searchQuery: '*',
        searchOption: 'Keyword',
        authorityPrefix: '',
        authorityRecords: [
          { heading: 'C367959 Erbil, H. Yıldırım', startNumber: `${getRandomPostfix()}1` },
          {
            heading: 'C367959 Santritter, Joannes Lucilius',
            startNumber: `${getRandomPostfix()}2`,
          },
          { heading: 'C367959 Chang, Tong-sik', startNumber: `${getRandomPostfix()}3` },
        ],
        createdAuthorityIds: [],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C367959*');

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.then(() => {
              testData.authorityRecords.forEach((record) => {
                MarcAuthorities.createMarcAuthorityViaAPI(
                  testData.authorityPrefix,
                  record.startNumber,
                  [
                    {
                      tag: '100',
                      content: `$a ${record.heading}`,
                      indicators: ['1', '\\'],
                    },
                  ],
                ).then((createdRecordId) => {
                  testData.createdAuthorityIds.push(createdRecordId);
                });
              });
            }).then(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
              // Ensure we're on Search toggle (should be default state)
              MarcAuthorities.switchToSearch();
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        testData.createdAuthorityIds.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        "C367959 Search | Verify that panes size doesn't change while the loading pane is visible (spitfire)",
        { tags: ['extendedPath', 'spitfire', 'C367959'] },
        () => {
          // Step 1: Fill in the search box with wildcard query
          MarcAuthoritiesSearch.fillSearchInput(testData.searchQuery);

          // Step 2: Click Search button and verify results displayed
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 3: Open first MARC Authority record
          MarcAuthorities.selectTitle(testData.authorityRecords[0].heading);
          MarcAuthority.waitLoading();

          // Step 4: Resize the Search & filter pane (first pane)
          let resizedFirstPaneWidth;
          MarcAuthorities.getPaneAuthoritiesFilterWidth().then((initialWidth) => {
            const targetWidth = initialWidth + 100;
            MarcAuthorities.resizePaneAuthoritiesFilter(targetWidth);
            MarcAuthorities.getPaneAuthoritiesFilterWidth().then((newWidth) => {
              resizedFirstPaneWidth = newWidth;
              expect(Math.abs(newWidth - initialWidth)).to.be.greaterThan(50);

              // Step 5: Open another record and verify first pane size persists
              MarcAuthorities.selectTitle(testData.authorityRecords[1].heading);
              MarcAuthority.waitLoading();
              MarcAuthorities.verifyPaneAuthoritiesFilterWidth(resizedFirstPaneWidth);
              MarcAuthority.contains(testData.authorityRecords[1].heading);

              // Step 6: Resize the detail view pane (third pane)
              let resizedThirdPaneWidth;
              MarcAuthorities.getPaneMarcViewWidth().then((initialThirdWidth) => {
                const targetThirdWidth = initialThirdWidth + 60;
                MarcAuthorities.resizePaneMarcView(-1 * targetThirdWidth);
                MarcAuthorities.getPaneMarcViewWidth().then((newThirdWidth) => {
                  resizedThirdPaneWidth = newThirdWidth;
                  expect(Math.abs(newThirdWidth - initialThirdWidth)).to.be.greaterThan(50);

                  // Step 7: Open another record and verify both pane sizes persist
                  MarcAuthorities.selectTitle(testData.authorityRecords[2].heading);
                  MarcAuthority.waitLoading();

                  // Verify first pane size remains unchanged
                  MarcAuthorities.verifyPaneAuthoritiesFilterWidth(resizedFirstPaneWidth);

                  // Verify third pane size remains unchanged
                  MarcAuthorities.verifyPaneMarcViewWidth(resizedThirdPaneWidth);

                  // Verify the record opened successfully
                  MarcAuthority.contains(testData.authorityRecords[2].heading);

                  // Step 8: Resize the Search & filter pane back to normal size
                  MarcAuthorities.resizePaneAuthoritiesFilter(initialWidth);
                  MarcAuthorities.getPaneAuthoritiesFilterWidth().then((finalWidth) => {
                    // Verify pane resized back (within tolerance)
                    expect(Math.abs(finalWidth - initialWidth)).to.be.lessThan(20);
                  });
                });
              });
            });
          });
        },
      );
    });
  });
});
