import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../support/constants';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(5);
      const randomLetters = getRandomLetters(15);
      const totalAuthorities = 101;
      const testData = {
        tag008: '008',
        tag100: '100',
        tag245: '245',
        tag700: '700',
        authorityPrefix: `AT_C367926_MarcAuthority_${randomPostfix}`,
        bibTitle: `AT_C367926_MarcBibInstance_${randomPostfix}`,
      };

      const authData = { prefix: randomLetters, startWithNumber: randomDigits };

      const marcBibFields = [
        { tag: testData.tag008, content: QuickMarcEditor.defaultValid008Values },
        {
          tag: testData.tag245,
          content: `$a ${testData.bibTitle}`,
          indicators: ['1', '1'],
        },
        {
          tag: testData.tag700,
          content: `$a ${testData.authorityPrefix} link target`,
          indicators: ['1', '\\'],
        },
      ];

      const createdAuthorityIds = [];
      let createdBibId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C367926');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            // Create 101 MARC authority records if there is not enough existing
            cy.getAuthoritiesCountViaAPI().then((authoritiesCount) => {
              if (authoritiesCount < 150) {
                const createCount = totalAuthorities - authoritiesCount / 2;
                for (let i = 0; i < createCount; i++) {
                  MarcAuthorities.createMarcAuthorityViaAPI(
                    authData.prefix,
                    `${authData.startWithNumber}${String(i).padStart(4, '0')}`,
                    [
                      {
                        tag: testData.tag100,
                        content: `$a ${testData.authorityPrefix} ${i}`,
                        indicators: ['\\', '\\'],
                      },
                    ],
                  ).then((createdRecordId) => {
                    createdAuthorityIds.push(createdRecordId);
                  });
                }
              }

              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdBibId = instanceId;
                },
              );
            });
          }).then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.searchByTitle(createdBibId);
            InventoryInstances.selectInstanceById(createdBibId);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag700);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdBibId);
        createdAuthorityIds.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C367926 MARC Authority plug-in | Search: Verify that pagination buttons are visible after changing screen scale (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C367926'] },
        () => {
          const defaultWidth = Cypress.config('viewportWidth');
          const defaultHeight = Cypress.config('viewportHeight');

          // Steps 1-2: Search by keyword with query returning more than 1 page of results
          MarcAuthorities.searchByParameter(MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME, '*');
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 3: Verify pagination buttons are shown, "Next" button is enabled
          MarcAuthorities.checkPreviousPaginationButtonEnabled(false);
          MarcAuthorities.checkNextPaginationButtonEnabled();

          // Step 4: Zoom in to 150% (shrink viewport dimensions to simulate zoom)
          cy.viewport(Math.round(defaultWidth / 1.5), Math.round(defaultHeight / 1.5));
          MarcAuthorities.checkPreviousPaginationButtonEnabled(false);
          MarcAuthorities.checkNextPaginationButtonEnabled();

          // Step 5: Zoom out back to 100%
          cy.viewport(defaultWidth, defaultHeight);
          MarcAuthorities.checkPreviousPaginationButtonEnabled(false);
          MarcAuthorities.checkNextPaginationButtonEnabled();
        },
      );
    });
  });
});
