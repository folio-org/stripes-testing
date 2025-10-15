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
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);
        const testData = {
          tags: {
            tag008: '008',
            tag110: '110',
            tag245: '245',
          },
          bibTitle: `AT_C569579_MarcBibInstance_${randomPostfix}`,
          authorityField110Content: `$a AT_C569579_MarcAuthority_${randomPostfix} $4 ptf $b Subordinate unit $c Location of meeting $d Date of meeting or treaty signing $e Relator term $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $6 Linkage $7 Data provenance $8 Field link and sequence number`,
          bibField110Content: `$a AT_C569579_MarcAuthority_${randomPostfix} $b Subordinate unit $c Location of meeting $d - Date of meeting or treaty signing $g Miscellaneous information $n Number of part/section/meeting $4 prf $f fuel $k kot $l line $p poem $t test $u ultra`,
          authorityHeading: `AT_C569579_MarcAuthority_${randomPostfix} Subordinate unit Location of meeting Date of meeting or treaty signing Miscellaneous information Number of part/section/meeting Form subdivision General subdivision Chronological subdivision Geographic subdivision`,
          searchQuery: `AT_C569579_MarcAuthority_${randomPostfix} Subordinate unit Location of meeting - Date of meeting or treaty signing Miscellaneous information Number of part/section/meeting`,
          browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.CORPORATE_CONFERENCE_NAME,
        };

        const authData = { prefix: randomLetters, startWithNumber: '1' };

        const authorityFields = [
          {
            tag: testData.tags.tag110,
            content: testData.authorityField110Content,
            indicators: ['2', '\\'],
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
            tag: testData.tags.tag110,
            content: testData.bibField110Content,
            indicators: ['2', '\\'],
          },
        ];

        const linkedFieldData = {
          tag: testData.tags.tag110,
          ind1: '2',
          ind2: '\\',
          controlledLetterSubfields: `$a AT_C569579_MarcAuthority_${randomPostfix} $b Subordinate unit $c Location of meeting $d Date of meeting or treaty signing $g Miscellaneous information $n Number of part/section/meeting`,
          uncontrolledLetterSubfields: '$f fuel $k kot $l line $p poem $t test $u ultra',
          controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
          uncontrolledDigitSubfields: '$4 prf',
        };

        let userData = {};
        const createdInstanceIds = [];
        const createdAuthorityIds = [];

        before(() => {
          cy.getAdminToken();
          // Make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569579_MarcAuthority');

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.then(() => {
              // Create MARC bibliographic record
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceIds.push(instanceId);
                },
              );
              // Create MARC authority record
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
          'C569579 Link "110" field with all subfields (except $0) when MARC authority 1XX has all subfields (except $t) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C569579'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceIds[0]);
            InventoryInstances.selectInstanceById(createdInstanceIds[0]);
            InventoryInstance.waitLoading();
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag110);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSearchQuery(testData.searchQuery);
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.browseOption);
            MarcAuthorities.verifyRecordFound(testData.authorityHeading);
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));

            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();
            InventoryInstance.getId().then((id) => {
              createdInstanceIds.push(id);
            });

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));
          },
        );
      });
    });
  });
});
