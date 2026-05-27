import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../support/utils/stringTools';
import { MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const randomPostfix = getRandomPostfix();
        const randomDigits = `397370${randomNDigitNumber(15)}`;

        const subjectUrlPrefix = 'http://id.loc.gov/authorities/subjects/';
        const nameUrlPrefix = 'http://id.loc.gov/authorities/names/';

        // Authority A (subjects / 650): 001 has NO valid prefix; 010 $a HAS valid "sh" prefix
        const authorityA = {
          prefix001: '',
          value001: `${randomDigits}1`,
          initial010: `sh${randomDigits}2`,
          updated010: `sh${randomDigits}3`,
          tag: '150',
          heading: `AT_C397370_MarcAuthority_A_${randomPostfix}`,
          get field150Content() {
            return `$a ${this.heading}`;
          },
          additionalTag: '450',
          field450Content: `$a AT_C397370_MarcAuthority_Field450_A_${randomPostfix}`,
        };

        // Authority B (personal name / 700): 001 HAS valid "n" prefix; 010 $a also HAS "n" prefix
        const authorityB = {
          prefix001: 'n',
          value001: `${randomDigits}4`,
          initial010: `n${randomDigits}5`,
          updated010: `${randomDigits}6`, // valid prefix removed after update
          tag: '100',
          heading: `AT_C397370_MarcAuthority_B_${randomPostfix}`,
          get field100Content() {
            return `$a ${this.heading}`;
          },
          additionalTag: '400',
          field400Content: `$a AT_C397370_MarcAuthority_Field400_B_${randomPostfix}`,
        };

        const testData = {
          tag008: '008',
          tag010: '010',
          tag150: authorityA.tag,
          tag100: authorityB.tag,
          tag245: '245',
          tag400: authorityB.additionalTag,
          tag450: authorityA.additionalTag,
          tag650: '650',
          tag700: '700',
          bibTitle: `AT_C397370_MarcBibInstance_${randomPostfix}`,
          // $0 values for 650 after linking (from authority A 010 $a)
          initial$0For650: `$0 ${subjectUrlPrefix}${authorityA.initial010}`,
          // $0 values for 700 after linking (from authority B 010 $a)
          initial$0For700: `$0 ${nameUrlPrefix}${authorityB.initial010}`,
          // $0 for 650 after authority A 010 update (keep valid prefix, different value)
          updated$0For650: `$0 ${subjectUrlPrefix}${authorityA.updated010}`,
          // $0 for 700 after authority B 010 update (remove valid prefix → fall back to 001 URL)
          updated$0For700: `$0 ${nameUrlPrefix}${authorityB.prefix001}${authorityB.value001}`,
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
            tag: testData.tag650,
            content: authorityA.field150Content,
            indicators: ['\\', '0'],
          },
          {
            tag: testData.tag700,
            content: authorityB.field100Content,
            indicators: ['0', '\\'],
          },
        ];

        let userData;
        let testInstanceId;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C397370_');

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              testInstanceId = instanceId;
            },
          );

          MarcAuthorities.createMarcAuthorityViaAPI(authorityA.prefix001, authorityA.value001, [
            {
              tag: testData.tag010,
              content: `$a ${authorityA.initial010}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: testData.tag150,
              content: authorityA.field150Content,
              indicators: ['\\', '\\'],
            },
            {
              tag: testData.tag450,
              content: authorityA.field450Content,
              indicators: ['\\', '\\'],
            },
          ]).then((authorityId) => {
            testData.authorityAId = authorityId;
          });

          MarcAuthorities.createMarcAuthorityViaAPI(authorityB.prefix001, authorityB.value001, [
            {
              tag: testData.tag010,
              content: `$a ${authorityB.initial010}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: testData.tag100,
              content: authorityB.field100Content,
              indicators: ['1', '\\'],
            },
            {
              tag: testData.tag400,
              content: authorityB.field400Content,
              indicators: ['\\', '\\'],
            },
          ]).then((authorityId) => {
            testData.authorityBId = authorityId;
          });

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

        after('Delete test data', () => {
          cy.getAdminToken();
          MarcAuthority.deleteViaAPI(testData.authorityAId, true);
          MarcAuthority.deleteViaAPI(testData.authorityBId, true);
          InventoryInstances.deleteInstanceByTitleViaApi(testData.bibTitle);
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C397370 Update "010" value with valid/invalid prefix in "MARC authority" record while "MARC Bib" record being edited and linked (NOT saved link; "$0" = "010" with valid prefix) (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C397370'] },
          () => {
            // Step 1: Open Edit MARC bib record
            InventoryInstances.searchByTitle(testInstanceId);
            InventoryInstances.selectInstanceById(testInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();

            // Steps 2-4: Link 650 field to authority A (subjects)
            InventoryInstance.verifyAndClickLinkIcon(testData.tag650);
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSelectOptionFieldContent(MARC_AUTHORITY_BROWSE_OPTIONS.SUBJECT);
            MarcAuthorities.selectTitle(authorityA.heading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(authorityA.field150Content);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag650);
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              testData.tag650,
              '\\',
              '0',
              authorityA.field150Content,
              '',
              testData.initial$0For650,
              '',
            );

            // Steps 5-7: Link 700 field to authority B (personal name)
            InventoryInstance.verifyAndClickLinkIcon(testData.tag700);
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorities.checkSelectOptionFieldContent(
              MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
            );
            MarcAuthorities.selectTitle(authorityB.heading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(authorityB.field100Content);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag700);
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              testData.tag700,
              '0',
              '\\',
              authorityB.field100Content,
              '',
              testData.initial$0For700,
              '',
            );

            // Steps 8-11 (via API): Update authority A 010 $a - keep valid prefix, change value
            cy.then(() => {
              cy.getMarcRecordDataViaAPI(testData.authorityAId).then((marcData) => {
                const field010 = marcData.fields.find((f) => f.tag === testData.tag010);
                field010.content = `$a ${authorityA.updated010}`;
                cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                  ({ status }) => {
                    expect(status).to.eq(202);
                  },
                );
              });
            })
              .then(() => {
                // Steps 12-15 (via API): Update authority B 010 $a - remove valid prefix
                cy.getMarcRecordDataViaAPI(testData.authorityBId).then((marcData) => {
                  const field010 = marcData.fields.find((f) => f.tag === testData.tag010);
                  field010.content = `$a ${authorityB.updated010}`;
                  cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                    ({ status }) => {
                      expect(status).to.eq(202);
                    },
                  );
                });
              })
              .then(() => {
                // Step 16: Click Save & keep editing
                QuickMarcEditor.clickSaveAndKeepEditing();

                // Verify 650 $0 updated to new authority A 010 value (valid prefix kept)
                QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
                  testData.tag650,
                  '\\',
                  '0',
                  authorityA.field150Content,
                  '',
                  testData.updated$0For650,
                  '',
                );

                // Verify 700 $0 reverted to authority B 001 URL (010 prefix was removed)
                QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
                  testData.tag700,
                  '0',
                  '\\',
                  authorityB.field100Content,
                  '',
                  testData.updated$0For700,
                  '',
                );
              });
          },
        );
      });
    });
  });
});
