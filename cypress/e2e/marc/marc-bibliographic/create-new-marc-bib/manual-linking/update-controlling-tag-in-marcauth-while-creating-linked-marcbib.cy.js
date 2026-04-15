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

        // Authority 001 has valid prefix
        const authorityPrefix = 'n';
        const authorityNaturalId = `422139${randomDigits}`;
        const authority001Value = `${authorityPrefix}${authorityNaturalId}`;
        const advancedSearchOption = MARC_AUTHORITY_SEARCH_OPTIONS.ADVANCED_SEARCH;
        const sourceUrlPrefix = 'http://id.loc.gov/authorities/names/';

        const testData = {
          tag100: '100',
          tag010: '010',
          tag245: '245',
          tagUpdated: '110',
          bibTitle: `AT_C422139_MarcBibInstance_${randomPostfix}`,
          contributor: `AT_C422139_Contributor_${randomPostfix}`,
          authorityField100Content: `$a AT_C422139_MarcAuthority_${randomPostfix} $d 1967-`,
          // 010 $a with valid prefix (same as 001 value)
          initial010Value: `$a ${authority001Value}`,
          // $0 value typed in bib field step 5 = authority 010 $a (= 001 value here)
          bib100Content: `$a AT_C422139_Contributor_${randomPostfix} $0 ${authority001Value}`,
          // After linking (step 7): $0 = URL from 010 $a
          expected$0AfterLinking: `${sourceUrlPrefix}${authority001Value}`,
          // After authority tag changes and link breaks, bib reverts to original content
          expected100ContentAfterUnlink: `$a AT_C422139_Contributor_${randomPostfix} $0 ${authority001Value}`,
        };

        let userData;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422139');

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
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]).then((userProperties) => {
            userData = userProperties;

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
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
          'C422139 Updating tag in controlling field of "MARC Authority" record while "MARC Bib" record being created (NOT saved link) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C422139'] },
          () => {
            // Steps 1-2 (Inventory tab): Create new MARC bib, fill 245
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.bibTitle}`);

            // Steps 3-4: Update LDR positions 06/07 and clear 008 errors
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 5: Add 100 field with $0 = authority 001 value (valid prefix)
            MarcAuthority.addNewField(4, testData.tag100, testData.bib100Content);

            // Step 6: Click link icon on 100 field
            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tag100);
            InventoryInstance.verifySelectMarcAuthorityModal();

            // Search for the authority and link it
            MarcAuthorities.verifySearchTabIsOpened();
            MarcAuthoritiesSearch.verifySelectedSearchOption(advancedSearchOption);
            MarcAuthority.contains(testData.authorityField100Content);
            InventoryInstance.clickLinkButton();

            // Step 7: Verify linked 100 field - $0 contains URL from 010 $a
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              testData.tag100,
              '\\',
              '\\',
              testData.authorityField100Content,
              '',
              `$0 ${testData.expected$0AfterLinking}`,
              '',
            );

            // Steps 8-11 (Authority tab - via API): change 1XX tag from 100 to 110
            cy.getMarcRecordDataViaAPI(testData.authorityId).then((marcData) => {
              const field100 = marcData.fields.find((f) => f.tag === testData.tag100);
              field100.tag = testData.tagUpdated;
              marcData.relatedRecordVersion = '1';
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.eq(202);

                  // Step 12 (Inventory tab): Save & close the MARC bib
                  QuickMarcEditor.pressSaveAndClose();
                  QuickMarcEditor.checkAfterSaveAndClose();

                  // Step 13: View source and verify 100 field is not linked (original content)
                  InventoryInstance.waitLoading();
                  InventoryInstance.viewSource();
                  InventoryViewSource.checkRowExistsWithTagAndValue(
                    testData.tag100,
                    testData.expected100ContentAfterUnlink,
                  );

                  // Step 14: Close view source pane
                  InventoryViewSource.close();
                  InventoryInstance.waitLoading();

                  // Step 15: Open Edit MARC bib and verify 100 field is not linked
                  InventoryInstance.editMarcBibliographicRecord();
                  QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
                    testData.tag100,
                    '\\',
                    '\\',
                    testData.expected100ContentAfterUnlink,
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
