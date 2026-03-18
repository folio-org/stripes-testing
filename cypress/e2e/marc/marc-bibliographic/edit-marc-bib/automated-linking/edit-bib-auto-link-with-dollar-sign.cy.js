import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(15);
        const testData = {
          tags: {
            tag008: '008',
            tag100: '100',
            tag130: '130',
            tag245: '245',
            tag630: '630',
            tag650: '650',
          },
          bibTitle: `AT_C451567_MarcBibInstance_${randomPostfix}`,
          authorityHeadingPrefix: `AT_C451567_MarcAuthority_${randomPostfix}`,
          autolinkCallouts: [
            'Field 100 and 630 has been linked to MARC authority record(s).',
            'Field 650 must be set manually by selecting the link icon.',
          ],
          contributorSectionId: 'list-contributors',
          subjectSectionId: 'list-subject',
        };
        const authData = { prefix: randomLetters, startWithNumber: '4515670001' };
        const authorityFields100 = [
          {
            tag: testData.tags.tag100,
            content: `$a ${testData.authorityHeadingPrefix} A{dollar}AP Rocky $c (Rapper), $d 1988-`,
            indicators: ['0', '\\'],
          },
        ];
        const authorityFields130 = [
          {
            tag: testData.tags.tag130,
            content: `$a ${testData.authorityHeadingPrefix} {dollar}6 story`,
            indicators: ['\\', '0'],
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
            tag: testData.tags.tag100,
            content: '$a A{dollar}AP Rocky $c (Rapper), $d 1988-',
            indicators: ['0', '\\'],
          },
          {
            tag: testData.tags.tag650,
            content: '$a Popular music. $2 fast $0 (OCoLC)nonexistent4515674515671',
            indicators: ['\\', '7'],
          },
          {
            tag: testData.tags.tag650,
            content: '$a Rap (Music) $2 fast $0 (OCoLC)nonexistent4515674515672',
            indicators: ['\\', '7'],
          },
        ];
        const field100UpdatedContent = `${marcBibFields[2].content} $0 ${authData.prefix}${authData.startWithNumber} $x dollar{dollar} sign test`;
        const newField = {
          tag: testData.tags.tag630,
          content: `$a test $0 ${authData.prefix}${authData.startWithNumber + 1}`,
          indicators: ['\\', '\\'],
        };
        const linkedFieldData100 = {
          tag: marcBibFields[2].tag,
          ind1: marcBibFields[2].indicators[0],
          ind2: marcBibFields[2].indicators[1],
          controlledLetterSubfields: authorityFields100[0].content,
          uncontrolledLetterSubfields: '$x dollar{dollar} sign test',
          controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
          uncontrolledDigitSubfields: '',
        };
        const linkedFieldData630 = {
          tag: newField.tag,
          ind1: newField.indicators[0],
          ind2: newField.indicators[1],
          controlledLetterSubfields: authorityFields130[0].content,
          uncontrolledLetterSubfields: '',
          controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber + 1}`,
          uncontrolledDigitSubfields: '',
        };
        const contributorValue = `${testData.authorityHeadingPrefix} A$AP Rocky (Rapper), 1988-`;
        const subjectValue = `${testData.authorityHeadingPrefix} $6 story`;

        let userData = {};
        let createdInstanceId;
        const createdAuthorityIds = [];

        before(() => {
          cy.getAdminToken();
          // Make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C451567');

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
              // Create MARC authority records
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber,
                authorityFields100,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);

                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber + 1,
                  authorityFields130,
                ).then((createdRecordId2) => {
                  createdAuthorityIds.push(createdRecordId2);
                });
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
          'C451567 Automated linking of "MARC bib" field with "MARC authority" record which has "$" sign ("{dollar}" code) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C451567'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            QuickMarcEditor.updateFirstFieldByTag(testData.tags.tag100, field100UpdatedContent);
            QuickMarcEditor.checkContentByTag(testData.tags.tag100, field100UpdatedContent);

            QuickMarcEditor.addNewField(newField.tag, newField.content, 7);
            QuickMarcEditor.checkContentByTag(newField.tag, newField.content);

            QuickMarcEditor.clickLinkHeadingsButton();
            testData.autolinkCallouts.forEach((callout) => {
              QuickMarcEditor.checkCallout(callout);
            });
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData100));
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData630));

            QuickMarcEditor.pressSaveAndClose();
            InventoryInstance.waitLoading();
            InventoryInstance.checkAuthorityAppIconInSection(
              testData.contributorSectionId,
              contributorValue,
              true,
            );
            InventoryInstance.checkAuthorityAppIconInSection(
              testData.subjectSectionId,
              subjectValue,
              true,
            );

            InventoryInstance.viewSource();
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(linkedFieldData100.tag);
            InventoryViewSource.checkRowExistsWithTagAndValue(
              linkedFieldData100.tag,
              `${linkedFieldData100.controlledLetterSubfields.replace('{dollar}', '$')} ${linkedFieldData100.uncontrolledLetterSubfields.replace('{dollar}', '$')} ${linkedFieldData100.controlledDigitSubfields} $9 ${createdAuthorityIds[0]}`,
            );
            InventoryViewSource.verifyLinkedToAuthorityIconByTag(linkedFieldData630.tag);
            InventoryViewSource.checkRowExistsWithTagAndValue(
              linkedFieldData630.tag,
              `${linkedFieldData630.controlledLetterSubfields.replace('{dollar}', '$')} ${linkedFieldData630.controlledDigitSubfields} $9 ${createdAuthorityIds[1]}`,
            );
          },
        );
      });
    });
  });
});
