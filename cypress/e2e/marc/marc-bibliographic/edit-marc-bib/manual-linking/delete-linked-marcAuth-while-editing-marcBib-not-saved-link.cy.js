import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../../support/utils/stringTools';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          tag008: '008',
          tag100: '100',
          tag245: '245',
          authoritySearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
          authorityHeading: `AT_C397391_MarcAuthority_${randomPostfix}`,
          bibTitle: `AT_C397391_MarcBibInstance_${randomPostfix}`,
          contributorAccordion: 'Contributor',
          naturalIdPrefix: `397391${randomFourDigitNumber()}`,
          linkedToAuthorityIconText: 'Linked to MARC authority',
        };

        const authorityFields = [
          {
            tag: testData.tag100,
            content: `$a ${testData.authorityHeading}`,
            indicators: ['1', '\\'],
          },
        ];

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
            content: `$a ${testData.authorityHeading} $e author.`,
            indicators: ['1', '\\'],
          },
        ];

        let userData = {};
        let createdInstanceId;
        let authorityId;

        before('Create users and data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C397391_');
          InventoryInstances.deleteInstanceByTitleViaApi('C397391_');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.then(() => {
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );

              MarcAuthorities.createMarcAuthorityViaAPI(
                '',
                testData.naturalIdPrefix,
                authorityFields,
              ).then((createdRecordId) => {
                authorityId = createdRecordId;
              });
            }).then(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
        });

        after('Delete users and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          MarcAuthority.deleteViaAPI(authorityId, true);
        });

        it(
          'C397391 Delete linked "MARC Authority" record while "MARC Bib" record being edited (NOT saved link) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C397391'] },
          () => {
            // Step 1: Open existing MARC bib for editing
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();

            // Step 2: Click link icon on 100 field
            InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.authoritySearchOption);
            MarcAuthorities.verifySearchResultTabletIsAbsent(false);

            // Step 3: Search for MARC authority record
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.checkRow(testData.authorityHeading);

            // Step 4: Link to authority record
            MarcAuthorities.selectTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);

            // Step 5-6: Delete the authority record (via API)
            MarcAuthority.deleteViaAPI(authorityId);
            cy.recurse(
              () => MarcAuthorities.getMarcAuthoritiesViaApi({
                query: `keyword="${testData.authorityHeading}" and authRefType=="Authorized"`,
              }),
              (foundAuthorities) => foundAuthorities.length === 0,
              { limit: 10, timeout: 12000, delay: 1000 },
            );

            // Step 7: Save & close the MARC bib
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 8: Verify contributor is NOT linked in detail view
            InventoryInstance.verifyRecordAndMarcAuthIconAbsence(
              testData.contributorAccordion,
              `${testData.linkedToAuthorityIconText}\n${testData.authorityHeading}`,
            );

            // Step 9: View source - verify 100 field has original value, no MARC auth icon
            InventoryInstance.viewSource();
            InventoryViewSource.contains(`$a ${testData.authorityHeading}`);
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tag100, false);
          },
        );
      });
    });
  });
});
