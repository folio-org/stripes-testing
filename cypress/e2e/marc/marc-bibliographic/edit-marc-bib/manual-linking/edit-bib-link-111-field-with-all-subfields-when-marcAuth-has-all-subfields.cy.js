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
            tag111: '110',
            tag245: '245',
          },
          bibTitle: `AT_C569580_MarcBibInstance_${randomPostfix}`,
          authorityField111Content: `$a AT_C569580_MarcAuthority_${randomPostfix} $c Location of meeting $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $h Medium $j Relator term $k Form subheading $l Language of a work $n Number of part/section/meeting $p Name of part/section of a work $q Name of meeting following jurisdiction name entry element $s Version $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision $6 Linkage $7 Data provenance $8 Field link and sequence number`,
          bibField111Content: `$a AT_C569580_MarcAuthority_${randomPostfix} $c Location of meeting $b ben $d Date of meeting or treaty signing $e Subordinate unit $f Date of a work $g Miscellaneous information $k key $l level $n Number of part/section/meeting $q Name of meeting following jurisdiction name entry element $p put $t test $u uuui`,
          authorityHeading: `AT_C569580_MarcAuthority_${randomPostfix} Location of meeting Date of meeting or treaty signing Miscellaneous information Number of part/section/meeting Form subdivision General subdivision Chronological subdivision Geographic subdivision`,
          searchQuery: `AT_C569580_MarcAuthority_${randomPostfix} Location of meeting ben Date of meeting or treaty signing Miscellaneous information Number of part/section/meeting`,
          browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.CORPORATE_CONFERENCE_NAME,
        };

        const authData = { prefix: randomLetters, startWithNumber: '1' };

        const authorityFields = [
          {
            tag: testData.tags.tag111,
            content: testData.authorityField111Content,
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
            tag: testData.tags.tag111,
            content: testData.bibField111Content,
            indicators: ['2', '\\'],
          },
        ];

        const linkedFieldData = {
          tag: testData.tags.tag111,
          ind1: '2',
          ind2: '\\',
          controlledLetterSubfields: `$a AT_C569580_MarcAuthority_${randomPostfix} $c Location of meeting $d Date of meeting or treaty signing $g Miscellaneous information $n Number of part/section/meeting`,
          uncontrolledLetterSubfields:
            '$e Subordinate unit $f Date of a work $k key $l level $q Name of meeting following jurisdiction name entry element $p put $t test $u uuui',
          controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
          uncontrolledDigitSubfields: '',
        };

        let userData = {};
        let createdInstanceId;
        const createdAuthorityIds = [];

        before(() => {
          cy.getAdminToken();
          // Make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569580_MarcAuthority');

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.then(() => {
              // Create MARC bibliographic record
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
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
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C569580 Link "111" field with all subfields (except $0) when MARC authority 1XX has all subfields (except $t) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C569580'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tags.tag111);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSearchQuery(testData.searchQuery);
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.browseOption);
            MarcAuthorities.verifyRecordFound(testData.authorityHeading);
            MarcAuthorities.selectIncludingTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));

            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.checkAfterSaveAndKeepEditing();

            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));
          },
        );
      });
    });
  });
});
