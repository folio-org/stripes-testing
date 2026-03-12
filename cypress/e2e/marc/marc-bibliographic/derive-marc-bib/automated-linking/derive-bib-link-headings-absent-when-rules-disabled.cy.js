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
    describe('Derive MARC bib', () => {
      describe('Automated linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);
        const instanceTitle = `AT_C389482_MarcBibInstance_${randomPostfix}`;
        const authorityHeadingPrefix = `AT_C389482_MarcAuthority_${randomPostfix}`;
        const authData = { prefix: randomLetters, startWithNumber: 1 };
        const linkableTags = [
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
        const linkedTag = '710';
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
            content: `$a Field${tag} $0 ${authData.prefix}${authData.startWithNumber + index}`,
            indicators: ['1', '\\'],
          });
        });
        const linkedFieldData710 = {
          tag: linkedTag,
          ind1: '1',
          ind2: '\\',
          controlledLetterSubfields: `$a ${authorityHeadingPrefix}_10`,
          uncontrolledLetterSubfields: '',
          controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber + 10}`,
          uncontrolledDigitSubfields: '',
        };

        let user;
        const createdAuthorityIds = [];
        let createdInstanceId;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C389482');
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C389482');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
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
                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber + index,
                  [
                    {
                      tag,
                      content: `$a ${authorityHeadingPrefix}_${index}`,
                      indicators: ['1', '\\'],
                    },
                  ],
                ).then((createdRecordId) => {
                  createdAuthorityIds.push(createdRecordId);
                });
              });
            })
              .then(() => {
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: createdInstanceId,
                  authorityIds: [createdAuthorityIds[10]],
                  bibFieldTags: [bibTags[10]],
                  authorityFieldTags: [authorityTags[10]],
                  finalBibFieldContents: [`$a ${authorityHeadingPrefix}_10`],
                });
              })
              .then(() => {
                linkableTags.forEach((tag) => {
                  QuickMarcEditor.setRulesForField(tag, false);
                });

                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                  authRefresh: true,
                });
              });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          linkableTags.forEach((tag) => {
            QuickMarcEditor.setRulesForField(tag, true);
          });
          Users.deleteViaApi(user.userId);
          createdAuthorityIds.forEach((authorityId) => {
            MarcAuthority.deleteViaAPI(authorityId, true);
          });
          InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
        });

        it(
          'C389482 "Link headings" button is NOT displayed in derive "MARC bib" window when auto-link for all heading types is disabled (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C389482'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.verifyRemoveLinkingModal();

            QuickMarcEditor.clickKeepLinkingButton();
            QuickMarcEditor.verifyRemoveLinkingModalAbsence();
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData710));
            bibTags.forEach((tag, index) => {
              if (tag !== linkedTag) {
                QuickMarcEditor.checkContentByTag(
                  tag,
                  `$a Field${tag} $0 ${authData.prefix}${authData.startWithNumber + index}`,
                );
              }
            });
            QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
          },
        );
      });
    });
  });
});
