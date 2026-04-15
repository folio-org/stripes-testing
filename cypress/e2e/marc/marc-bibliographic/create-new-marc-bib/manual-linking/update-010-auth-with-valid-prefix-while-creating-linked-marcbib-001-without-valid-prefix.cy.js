import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../../support/constants';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomDigits = randomNDigitNumber(10);

        // Authority 001 has NO valid prefix - just digits
        const authorityPrefix = '';
        const authorityNaturalId = `422138${randomDigits}`;
        // authority001Value equals authorityNaturalId since prefix is empty
        const authority001Value = `${authorityPrefix}${authorityNaturalId}`;
        const advancedSearchOption = MARC_AUTHORITY_SEARCH_OPTIONS.ADVANCED_SEARCH;
        const sourceUrlPrefix = 'http://id.loc.gov/authorities/names/';

        const testData = {
          tag100: '100',
          tag010: '010',
          tag245: '245',
          tag700: '700',
          bibTitle: `AT_C422138_MarcBibInstance_${randomPostfix}`,
          authorityField100Content: `$a AT_C422138_MarcAuthority_${randomPostfix} $b II, $c Queen of Great Britain, $d 1926-`,
          // 010 $a starts WITH valid prefix
          initial010Value: `$a n${randomDigits}`,
          // 010 $a with valid prefix removed
          updated010Value: `$a ${randomDigits}`,
          // After linking (step 7): $0 = URL from 010 $a (which has valid prefix)
          expected$0AfterLinking: `${sourceUrlPrefix}n${randomDigits}`,
          // After API update removes valid prefix from 010 $a, $0 reverts to raw 001 value (no URL)
          expected$0AfterUpdate: authority001Value,
        };

        let userData;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422138');

          // Authority 001 has no valid prefix; 010 $a starts with valid prefix
          MarcAuthorities.createMarcAuthorityViaAPI(authorityPrefix, authorityNaturalId, [
            {
              tag: testData.tag010,
              content: testData.initial010Value,
              indicators: ['\\', '\\'],
            },
            {
              tag: testData.tag100,
              content: testData.authorityField100Content,
              indicators: ['1', '\\'],
            },
          ]).then((authorityId) => {
            testData.authorityId = authorityId;
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          ]).then((userProperties) => {
            userData = userProperties;

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          MarcAuthority.deleteViaAPI(testData.authorityId, true);
          InventoryInstances.deleteInstanceByTitleViaApi(testData.bibTitle);
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C422138 Update "010" value with valid prefix in "MARC authority" record while "MARC Bib" record being created and linked (NOT saved link; "$0" = "010" with valid prefix) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C422138'] },
          () => {
            // Steps 1-2 (Inventory tab): Create new MARC bib, fill 245
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.bibTitle}`);

            // Steps 3-4: Update LDR positions 06/07 and clear 008 errors
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 5: Add 700 field with $0 = authority 001 value (no prefix, no URL)
            MarcAuthority.addNewField(4, testData.tag700, `$0 ${authority001Value}`);

            // Step 6: Click link icon on 700 field
            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tag700);
            InventoryInstance.verifySelectMarcAuthorityModal();

            // Search for the authority and link it
            MarcAuthorities.verifySearchTabIsOpened();
            MarcAuthoritiesSearch.verifySelectedSearchOption(advancedSearchOption);
            MarcAuthority.contains(testData.authorityField100Content);
            InventoryInstance.clickLinkButton();

            // Step 7: Verify linked 700 field - $0 contains URL from 010 $a (valid prefix present)
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              testData.tag700,
              '\\',
              '\\',
              testData.authorityField100Content,
              '',
              `$0 ${testData.expected$0AfterLinking}`,
              '',
            );

            // Steps 8-11 (Authority tab - via API): update 010 $a to remove valid prefix
            cy.getMarcRecordDataViaAPI(testData.authorityId).then((marcData) => {
              const field010 = marcData.fields.find((f) => f.tag === testData.tag010);
              field010.content = testData.updated010Value;
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.eq(202);

                  // Step 12 (Inventory tab): Save & close the MARC bib
                  QuickMarcEditor.pressSaveAndClose();
                  QuickMarcEditor.checkAfterSaveAndClose();

                  // Step 13: View source and verify $0 reverted to raw 001 value (no URL)
                  InventoryInstance.waitLoading();
                  InventoryInstance.viewSource();
                  InventoryViewSource.checkRowExistsWithTagAndValue(
                    testData.tag700,
                    testData.expected$0AfterUpdate,
                  );
                },
              );
            });
          },
        );
      });
    });
  });
});
