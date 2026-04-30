import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';
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
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomDigits = `397388${randomNDigitNumber(15)}`;
        const authorityIconText = 'Linked to MARC authority';

        const testData = {
          tag008: '008',
          tag010: '010',
          tag100: '100',
          tag245: '245',
          bibTitle: `AT_C397388_MarcBibInstance_${randomPostfix}`,
          authorityPrefix: '',
          authorityNaturalId: randomDigits,
          authorityField100OriginalContent: `$a AT_C397388_MarcAuthority_${randomPostfix} $d 1922-1969`,
          authorityField100UpdatedContent: `$a AT_C397388_MarcAuthority_${randomPostfix}_upd $c added`,
          authorityOriginalHeading: `AT_C397388_MarcAuthority_${randomPostfix} 1922-1969`,
          authorityUpdatedHeading: `AT_C397388_MarcAuthority_${randomPostfix}_upd added`,
          bibField100OriginalContent: `$a AT_C397388_MarcAuthority_${randomPostfix} $e author.`,
          bibField100LinkedContent: `$a AT_C397388_MarcAuthority_${randomPostfix} $d 1922-1969`,
          bibField100EditableContent: '$e author.',
        };

        const marcBibFields = [
          {
            tag: testData.tag008,
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: testData.tag245,
            content: `$a ${testData.bibTitle}`,
            indicators: ['1', '1'],
          },
          {
            tag: testData.tag100,
            content: testData.bibField100OriginalContent,
            indicators: ['1', '\\'],
          },
        ];

        let userData;
        let createdInstanceId;
        let createdAuthorityId;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C397388');

          cy.then(() => {
            // Create MARC Bib
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdInstanceId = instanceId;
              },
            );

            // Create MARC Authority
            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.authorityPrefix,
              testData.authorityNaturalId,
              [
                {
                  tag: testData.tag100,
                  content: testData.authorityField100OriginalContent,
                  indicators: ['1', '\\'],
                },
              ],
            ).then((authorityId) => {
              createdAuthorityId = authorityId;
            });
          }).then(() => {
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]).then((userProperties) => {
              userData = userProperties;

              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          MarcAuthority.deleteViaAPI(createdAuthorityId, true);
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C397388 Add/Edit/Delete controlled subfield in linked "MARC Authority" record while "MARC Bib" record being edited (NOT saved link) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C397388'] },
          () => {
            cy.then(() => {
              // Step 1: Edit MARC bib record
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.waitLoading();

              // Steps 2-4: Link 100 field to authority (Personal name - Browse)
              QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tag100);
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.verifyBrowseTabIsOpened();
              MarcAuthoritiesSearch.verifySelectedSearchOption(
                MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
              );
              MarcAuthorityBrowse.waitLoading();
              MarcAuthorities.switchToSearch();
              MarcAuthorities.verifySearchTabIsOpened();
              MarcAuthorities.searchBeats(testData.authorityOriginalHeading);
              MarcAuthority.contains(testData.authorityField100OriginalContent);
              MarcAuthorities.clickLinkButton();
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
                testData.tag100,
                '1',
                '\\',
                testData.bibField100LinkedContent,
                testData.bibField100EditableContent,
                `$0 ${testData.authorityPrefix}${testData.authorityNaturalId}`,
                '',
              );
            })
              .then(() => {
                // Steps 5-8: Update authority via API instead of UI
                // Edit controlled subfield ($a), Delete controlled subfield ($d), Add controlled subfield ($c)
                cy.getMarcRecordDataViaAPI(createdAuthorityId).then((marcData) => {
                  const field100 = marcData.fields.find((f) => f.tag === testData.tag100);
                  field100.content = testData.authorityField100UpdatedContent;
                  cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                    ({ status }) => {
                      expect(status).to.eq(202);
                    },
                  );
                });
              })
              .then(() => {
                // Step 9: Save & close the MARC bib
                QuickMarcEditor.pressSaveAndClose();
                QuickMarcEditor.checkAfterSaveAndClose();

                // Step 10: Verify updated contributor value
                InventoryInstance.waitLoading();
                InventoryInstance.waitInstanceRecordViewOpened();
                InventoryInstance.checkContributor(
                  `${authorityIconText}${testData.authorityUpdatedHeading}`,
                );

                // Step 11: View source - verify updated value in 100 field
                InventoryInstance.viewSource();
                InventoryViewSource.checkRowExistsWithTagAndValue(
                  testData.tag100,
                  testData.authorityField100UpdatedContent,
                );
                InventoryViewSource.close();
                InventoryInstance.waitLoading();
                InventoryInstance.waitInstanceRecordViewOpened();

                // Step 13: Browse contributors and verify updated authority
                InventorySearchAndFilter.switchToBrowseTab();
                InventorySearchAndFilter.validateBrowseToggleIsSelected();
                BrowseContributors.select();
                BrowseContributors.waitForContributorToAppear(
                  testData.authorityUpdatedHeading,
                  true,
                  true,
                );
                BrowseContributors.browse(testData.authorityUpdatedHeading);
                BrowseContributors.checkValueFound(testData.authorityUpdatedHeading, {
                  isBold: true,
                  isLinked: true,
                });
              });
          },
        );
      });
    });
  });
});
