import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../support/utils/stringTools';
import { MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../../support/constants';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomDigits = `1${randomNDigitNumber(15)}`;
        const sourceFilePrefix = 'n';

        const sourceUrlPrefix = 'http://id.loc.gov/authorities/names/';

        const testData = {
          tag008: '008',
          tag100: '100',
          tag240: '240',
          tag245: '245',
          tag010: '010',
          bibTitle: `AT_C397389_MarcBibInstance_${randomPostfix}`,
          // Authority 1: personal name, no $t in 1XX
          authority1Prefix: sourceFilePrefix,
          authority1NaturalId: randomDigits,
          authority1Field100Content: `$a AT_C397389_MarcAuthority_First_${randomPostfix} $d 1770-1827`,
          authority1Field100ContentWithT: `$a AT_C397389_MarcAuthority_First_${randomPostfix} $d 1770-1827 $t test`,
          authority1OriginalHeading: `AT_C397389_MarcAuthority_First_${randomPostfix} 1770-1827`,
          // Authority 2: name-title, has $t in 1XX
          authority2Prefix: sourceFilePrefix,
          authority2NaturalId: randomDigits + 1,
          authority2Field100Content: `$a AT_C397389_MarcAuthority_Second_${randomPostfix} $d 1770-1827 $t AT_C397389_MarcAuthority_Variations_${randomPostfix} $m piano, violin, cello, $n op. 44, $r E major`,
          authority2Field100ContentWithoutT: `$a AT_C397389_MarcAuthority_Second_${randomPostfix} $d 1770-1827 $m piano, violin, cello, $n op. 44, $r E major`,
          authority2OriginalHeading: `AT_C397389_MarcAuthority_Second_${randomPostfix} 1770-1827 AT_C397389_MarcAuthority_Variations_${randomPostfix} piano, violin, cello, op. 44, E major`,
          // Original bib values (shown in View source after link breaks)
          originalBib100Content: '$a AT_C397389_Beethoven, Ludwig van, $d 1770-1827, $e composer.',
          originalBib240Content: '$a AT_C397389_Variations, $m piano. $k Selections',
        };

        const marcBibFields = [
          {
            tag: testData.tag008,
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: testData.tag245,
            content: `$a ${testData.bibTitle}`,
            indicators: ['1', '0'],
          },
          {
            tag: testData.tag100,
            content: testData.originalBib100Content,
            indicators: ['1', '\\'],
          },
          {
            tag: testData.tag240,
            content: testData.originalBib240Content,
            indicators: ['1', '0'],
          },
        ];

        let userData;
        const createdInstanceIds = [];
        const createdAuthorityIds = [];

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C397389');

          cy.then(() => {
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdInstanceIds.push(instanceId);
              },
            );
            // Authority 1: personal name, no $t
            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.authority1Prefix,
              testData.authority1NaturalId,
              [
                {
                  tag: testData.tag010,
                  content: `$a ${testData.authority1Prefix}${testData.authority1NaturalId}`,
                  indicators: ['\\', '\\'],
                },
                {
                  tag: testData.tag100,
                  content: testData.authority1Field100Content,
                  indicators: ['1', '\\'],
                },
              ],
            ).then((authorityId) => {
              createdAuthorityIds.push(authorityId);
              testData.authority1Id = authorityId;
            });
            // Authority 2: name-title, has $t
            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.authority2Prefix,
              testData.authority2NaturalId,
              [
                {
                  tag: testData.tag010,
                  content: `$a ${testData.authority2Prefix}${testData.authority2NaturalId}`,
                  indicators: ['\\', '\\'],
                },
                {
                  tag: testData.tag100,
                  content: testData.authority2Field100Content,
                  indicators: ['1', '\\'],
                },
              ],
            ).then((authorityId) => {
              createdAuthorityIds.push(authorityId);
              testData.authority2Id = authorityId;
            });
          }).then(() => {
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            ]).then((userProperties) => {
              userData = userProperties;

              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          createdAuthorityIds.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
          createdInstanceIds.forEach((id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C397389 Add/Edit/Delete controlled subfield in linked "MARC Authority" record while "MARC Bib" record being derived (NOT saved link) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C397389'] },
          () => {
            cy.then(() => {
              // Step 1: Derive new MARC bib
              InventoryInstances.searchByTitle(createdInstanceIds[0]);
              InventoryInstances.selectInstanceById(createdInstanceIds[0]);
              InventoryInstance.waitLoading();
              InventoryInstance.deriveNewMarcBibRecord();

              // Steps 2-4: Link 100 field to authority 1 (Personal name - Browse)
              QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tag100);
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.verifyBrowseTabIsOpened();
              MarcAuthoritiesSearch.verifySelectedSearchOption(
                MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
              );
              MarcAuthorityBrowse.waitLoading();
              MarcAuthorities.switchToSearch();
              MarcAuthorities.verifySearchTabIsOpened();
              MarcAuthorities.searchBeats(testData.authority1OriginalHeading);
              MarcAuthority.contains(testData.authority1Field100Content);
              MarcAuthorities.clickLinkButton();
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
                testData.tag100,
                '1',
                '\\',
                testData.authority1Field100Content,
                '$e composer.',
                `$0 ${sourceUrlPrefix}${testData.authority1Prefix}${testData.authority1NaturalId}`,
                '',
              );

              // Steps 5-7: Link 240 field to authority 2 (Name-title - Browse)
              QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tag240);
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.verifyBrowseTabIsOpened();
              MarcAuthoritiesSearch.verifySelectedSearchOption(
                MARC_AUTHORITY_BROWSE_OPTIONS.NAME_TITLE,
              );
              MarcAuthorityBrowse.waitLoading();
              MarcAuthorities.switchToSearch();
              MarcAuthorities.verifySearchTabIsOpened();
              MarcAuthorities.searchBeats(testData.authority2OriginalHeading);
              MarcAuthority.contains(testData.authority2Field100Content);
              MarcAuthorities.clickLinkButton();
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
                testData.tag240,
                '1',
                '0',
                `$a AT_C397389_MarcAuthority_Variations_${randomPostfix} $m piano, violin, cello, $n op. 44, $r E major`,
                '',
                `$0 ${sourceUrlPrefix}${testData.authority2Prefix}${testData.authority2NaturalId}`,
                '',
              );
            })
              .then(() => {
                // Steps 8-11 (Authority tab - via API): add $t to authority 1's 100 field
                cy.getMarcRecordDataViaAPI(testData.authority1Id).then((marcData) => {
                  const field100 = marcData.fields.find((f) => f.tag === testData.tag100);
                  field100.content = testData.authority1Field100ContentWithT;
                  marcData.relatedRecordVersion = '1';
                  cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                    ({ status }) => {
                      expect(status).to.eq(202);
                    },
                  );
                });

                // Steps 12-14 (Authority tab - via API): delete $t from authority 2's 100 field
                cy.getMarcRecordDataViaAPI(testData.authority2Id).then((marcData) => {
                  const field100 = marcData.fields.find((f) => f.tag === testData.tag100);
                  field100.content = testData.authority2Field100ContentWithoutT;
                  marcData.relatedRecordVersion = '1';
                  cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                    ({ status }) => {
                      expect(status).to.eq(202);
                    },
                  );
                });
              })
              .then(() => {
                // Step 15: Save & close the derived MARC bib
                QuickMarcEditor.pressSaveAndClose();
                QuickMarcEditor.checkAfterSaveAndCloseDerive();

                // Step 16: Verify "Title data" still shows original alternative title
                InventoryInstance.waitLoading();
                InventoryInstance.verifyAlternativeTitle(
                  0,
                  1,
                  'AT_C397389_Variations, piano. Selections',
                );

                // Step 17: Verify "Contributors" does NOT show the Beethoven authority value
                InventoryInstance.verifyContributorAbsent(testData.authority1OriginalHeading);

                // Step 18: View source - verify both fields are unlinked with original bib values
                InventoryInstance.viewSource();
                InventoryViewSource.checkRowExistsWithTagAndValue(
                  testData.tag100,
                  testData.originalBib100Content,
                );
                InventoryViewSource.checkRowExistsWithTagAndValue(
                  testData.tag240,
                  testData.originalBib240Content,
                );
              });
          },
        );
      });
    });
  });
});
