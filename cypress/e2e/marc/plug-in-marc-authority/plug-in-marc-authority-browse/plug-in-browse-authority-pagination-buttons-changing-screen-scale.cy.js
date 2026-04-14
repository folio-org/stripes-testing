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
import { MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../support/constants';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Browse', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(5);
      const randomLetters = getRandomLetters(15);
      const totalAuthorities = 101;
      const testData = {
        tag008: '008',
        tag100: '100',
        tag245: '245',
        tag700: '700',
        authorityPrefix: `AT_C367927_MarcAuthority_${randomPostfix}`,
        bibTitle: `AT_C367927_MarcBibInstance_${randomPostfix}`,
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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C367927');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            // Create 101 MARC authority records if there is not enough existing
            cy.getAuthoritiesPersonalNameCountViaAPI().then((authoritiesCount) => {
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
            MarcAuthorities.switchToBrowse();
            MarcAuthorities.verifyBrowseTabIsOpened();
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
        'C367927 MARC Authority plug-in | Browse: Verify that pagination buttons are visible after changing screen scale (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C367927'] },
        () => {
          const defaultWidth = Cypress.config('viewportWidth');
          const defaultHeight = Cypress.config('viewportHeight');

          MarcAuthorityBrowse.checkResultWithNoValue(`${testData.authorityPrefix} link target`);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Steps 1-3: Browse by Personal name with a query returning more than 1 page of results
          MarcAuthorities.searchByParameter(MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME, '*');
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 4: Verify pagination buttons are shown
          MarcAuthorities.checkPreviousAndNextPaginationButtonsShown();

          // Step 5: Zoom in to 150% (shrink viewport dimensions to simulate zoom)
          cy.viewport(Math.round(defaultWidth / 1.5), Math.round(defaultHeight / 1.5));
          MarcAuthorities.checkPreviousAndNextPaginationButtonsShown();

          // Step 6: Zoom out back to 100%
          cy.viewport(defaultWidth, defaultHeight);
          MarcAuthorities.checkPreviousAndNextPaginationButtonsShown();
        },
      );
    });
  });
});
