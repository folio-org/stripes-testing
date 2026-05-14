import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const testData = {
        searchQuery: 'C367960',
        browseOption: 'Personal name',
        authorityPrefix: '',
        authorityRecords: [
          { heading: 'C367960 Erbil, H. Yıldırım', startNumber: `${getRandomPostfix()}1` },
          {
            heading: 'C367960 Santritter, Joannes Lucilius',
            startNumber: `${getRandomPostfix()}2`,
          },
          { heading: 'C367960 Chang, Tong-sik', startNumber: `${getRandomPostfix()}3` },
        ],
        createdAuthorityIds: [],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C367960*');

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
              MarcAuthorities.switchToBrowse();
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
        "C367960 Browse | Verify that panes size doesn't change while the loading pane is visible (spitfire)",
        { tags: ['extendedPath', 'spitfire', 'C367960'] },
        () => {
          // Step 1: Fill in the search box
          MarcAuthoritiesSearch.fillSearchInput(testData.searchQuery);

          // Step 2: Select browse option dropdown
          MarcAuthorities.selectSearchOptionInDropdown(testData.browseOption);

          // Step 3: Click Search button
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 4: Open first MARC Authority record
          MarcAuthorities.selectTitle(testData.authorityRecords[0].heading);
          MarcAuthority.waitLoading();

          // Step 5: Resize the Search & filter pane
          let resizedFirstPaneWidth;
          MarcAuthorities.getPaneAuthoritiesFilterWidth().then((initialWidth) => {
            const targetWidth = initialWidth + 100;
            MarcAuthorities.resizePaneAuthoritiesFilter(targetWidth);
            MarcAuthorities.getPaneAuthoritiesFilterWidth().then((newWidth) => {
              resizedFirstPaneWidth = newWidth;
              expect(Math.abs(newWidth - initialWidth)).to.be.greaterThan(50);

              // Step 6: Open another record and verify first pane size persists
              MarcAuthorities.selectTitle(testData.authorityRecords[1].heading);
              MarcAuthority.waitLoading();
              MarcAuthorities.verifyPaneAuthoritiesFilterWidth(resizedFirstPaneWidth);
              MarcAuthority.contains(testData.authorityRecords[1].heading);

              // Step 7: Resize the detail view pane (third pane)
              let resizedThirdPaneWidth;
              MarcAuthorities.getPaneMarcViewWidth().then((initialThirdWidth) => {
                const targetThirdWidth = initialThirdWidth + 60;
                MarcAuthorities.resizePaneMarcView(-1 * targetThirdWidth);
                MarcAuthorities.getPaneMarcViewWidth().then((newThirdWidth) => {
                  resizedThirdPaneWidth = newThirdWidth;
                  expect(Math.abs(newThirdWidth - initialThirdWidth)).to.be.greaterThan(50);

                  // Step 8: Open another record and verify both pane sizes persist
                  MarcAuthorities.selectTitle(testData.authorityRecords[2].heading);
                  MarcAuthority.waitLoading();

                  // Verify first pane size remains unchanged
                  MarcAuthorities.verifyPaneAuthoritiesFilterWidth(resizedFirstPaneWidth);

                  // Verify third pane size remains unchanged
                  MarcAuthorities.verifyPaneMarcViewWidth(resizedThirdPaneWidth);

                  // Verify the record opened successfully
                  MarcAuthority.contains(testData.authorityRecords[2].heading);
                });
              });
            });
          });
        },
      );
    });
  });
});
