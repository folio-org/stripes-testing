import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);
        const instanceTitle = `AT_C389481_MarcBibInstance_${randomPostfix}`;
        const authorityHeadingPrefix = `AT_C389481_MarcAuthority_${randomPostfix}`;
        const authData = { prefix: randomLetters, startWithNumber: 1 };
        const autoinkableTags = [
          '100',
          '110',
          '111',
          '130',
          '240',
          '600',
          '610',
          '611',
          '630',
          '650',
          '651',
          '655',
          '700',
          '710',
          '711',
          '730',
          '800',
          '810',
          '811',
          '830',
        ];
        const bibTags = [
          '100',
          '240',
          '600',
          '610',
          '611',
          '630',
          '650',
          '651',
          '655',
          '700',
          '710',
          '711',
          '730',
          '800',
          '810',
          '811',
          '830',
        ];
        const authorityTags = [
          '100',
          '100',
          '100',
          '110',
          '111',
          '130',
          '150',
          '151',
          '155',
          '100',
          '110',
          '111',
          '130',
          '100',
          '110',
          '111',
          '130',
        ];
        const linkableTag100 = '100';
        const marcBibFields = [
          {
            tag: '008',
            content: QuickMarcEditor.valid008ValuesInstance,
          },
          {
            tag: '245',
            content: `$a ${instanceTitle}`,
            indicators: ['1', '1'],
          },
        ];
        bibTags.forEach((tag, index) => {
          marcBibFields.push({
            tag,
            content: `$a ${authorityHeadingPrefix}_${index} $0 ${authData.prefix}${authData.startWithNumber + index}`,
            indicators: ['1', '\\'],
          });
        });

        const linkedFieldData100 = {
          tag: linkableTag100,
          ind1: '1',
          ind2: '\\',
          controlledLetterSubfields: `$a ${authorityHeadingPrefix}_0`,
          uncontrolledLetterSubfields: '',
          controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
          uncontrolledDigitSubfields: '',
        };

        let user;
        const createdAuthorityIds = [];
        let createdInstanceId;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C389481_');
          InventoryInstances.deleteInstanceByTitleViaApi('C389481_');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            user = createdUserProperties;

            cy.then(() => {
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );
              authorityTags.forEach((tag, index) => {
                // For 240 linking to 100, the authority 100 needs $t subfield (name/title)
                const authorityContent =
                  index === 1
                    ? `$a ${authorityHeadingPrefix}_${index} $t Title`
                    : `$a ${authorityHeadingPrefix}_${index}`;
                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber + index,
                  [
                    {
                      tag,
                      content: authorityContent,
                      indicators: ['1', '\\'],
                    },
                  ],
                ).then((createdRecordId) => {
                  createdAuthorityIds.push(createdRecordId);
                });
              });
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          autoinkableTags.forEach((tag) => {
            QuickMarcEditor.setRulesForField(tag, true);
          });
          Users.deleteViaApi(user.userId);
          createdAuthorityIds.forEach((authorityId) => {
            MarcAuthority.deleteViaAPI(authorityId, true);
          });
          InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
        });

        it(
          'C389481 "Link headings" button is NOT displayed in edit "MARC bib" window when auto-link for all heading types is disabled (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C389481'] },
          () => {
            cy.then(() => {
              autoinkableTags.forEach((tag) => {
                QuickMarcEditor.setRulesForField(tag, false);
              });
            }).then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });

              // Steps 1-2: Find and open edit window
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.waitLoading();

              // Step 2: Verify $0 subfields present and "Link headings" button absent
              bibTags.forEach((tag, index) => {
                QuickMarcEditor.checkContentByTag(
                  tag,
                  `$a ${authorityHeadingPrefix}_${index} $0 ${authData.prefix}${authData.startWithNumber + index}`,
                );
              });
              QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();

              // Step 3: Click link icon on 100 field
              InventoryInstance.verifyAndClickLinkIcon(linkableTag100);
              InventoryInstance.verifySelectMarcAuthorityModal();

              // Step 4: Link the authority
              MarcAuthority.contains(`${authorityHeadingPrefix}_0`);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingAuthority(linkableTag100);
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData100));
              QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();

              // Step 5: Save & keep editing
              QuickMarcEditor.clickSaveAndKeepEditing();
              QuickMarcEditor.checkAfterSaveAndKeepEditing();
              QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
            });
          },
        );
      });
    });
  });
});
