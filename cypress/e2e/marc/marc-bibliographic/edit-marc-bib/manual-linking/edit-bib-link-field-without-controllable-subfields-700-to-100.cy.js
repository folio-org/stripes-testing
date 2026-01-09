import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';
import { MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../../support/constants';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);
        const testData = {
          tags: {
            tag008: '008',
            tag100: '100',
            tag245: '245',
            tag700: '700',
          },
          bibTitle: `AT_C773208_MarcBibInstance_${randomPostfix}`,
          authorityField100Content: `$a AT_C773208_MarcAuthority_${randomPostfix}`,
          bibField700Content: '$e letterer. $j not important value $2 tes34',
          authorityHeading: `AT_C773208_MarcAuthority_${randomPostfix}`,
          searchQuery: '',
          browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
          contributorAccordion: 'Contributor',
        };

        const authData = { prefix: randomLetters, startWithNumber: '1' };

        const authorityFields = [
          {
            tag: testData.tags.tag100,
            content: testData.authorityField100Content,
            indicators: ['1', '\\'],
          },
        ];

        const marcBibFields = [
          {
            tag: testData.tags.tag008,
            content: QuickMarcEditor.defaultValid008Values,
          },
          {
            tag: testData.tags.tag245,
            content: `$a ${testData.bibTitle}`,
            indicators: ['1', '1'],
          },
          {
            tag: testData.tags.tag700,
            content: testData.bibField700Content,
            indicators: ['1', '\\'],
          },
        ];

        const linkedFieldData = {
          tag: testData.tags.tag700,
          ind1: '1',
          ind2: '\\',
          controlledLetterSubfields: testData.authorityField100Content,
          uncontrolledLetterSubfields: '$e letterer.',
          controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
          uncontrolledDigitSubfields: '$2 tes34',
        };

        let userData = {};
        const createdInstanceIds = [];
        const createdAuthorityIds = [];

        before(() => {
          cy.getAdminToken();
          // Make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C773208_MarcAuthority');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.then(() => {
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceIds.push(instanceId);
                },
              );

              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber,
                authorityFields,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });
            }).then(() => {
              cy.waitForAuthRefresh(() => {
                cy.login(userData.username, userData.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              }, 20_000);
            });
          });
        });

        after(() => {
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
          'C773208 Link "MARC Bib" field without controlled subfields to "MARC Authority" record. "Authority source file" value is "Not specified" (700 field to 100) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C773208'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceIds[0]);
            InventoryInstances.selectInstanceById(createdInstanceIds[0]);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag700);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSearchQuery(testData.searchQuery);
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.browseOption);
            MarcAuthorities.switchToSearch();
            MarcAuthorities.verifySearchTabIsOpened();
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));

            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(
              testData.contributorAccordion,
            );
          },
        );
      });
    });
  });
});
