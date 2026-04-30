import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();
          const randomDigits = `407714${randomNDigitNumber(10)}`;

          const testData = {
            tag100: '100',
            tag010: '010',
            tag245: '245',
            tag008: '008',
            bibTitle: `AT_C407714_MarcBibInstance_${randomPostfix}`,
            authorityTitle: `AT_C407714_MarcAuthority_${randomPostfix}, 1922-1969`,
            authorityTitleUpdated: `AT_C407714_MarcAuthority_${randomPostfix}, J.`,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
            localLabel: 'Local',
            sourcePrefix: 'n',
            sourceUrlPrefix: 'http://id.loc.gov/authorities/names/',
            originalNaturalId: `${randomDigits}01`,
            newNaturalId: `${randomDigits}02`,
          };

          const authData = {
            prefix: '',
            startWithNumber: randomDigits,
            initial010Value: `$a ${testData.sourcePrefix}${testData.originalNaturalId}`,
            updated010Value: `$a ${testData.sourcePrefix}${testData.newNaturalId}`,
            initial100Content: `$a AT_C407714_MarcAuthority_${randomPostfix}, $d 1922-1969`,
            updated100Content: `$a AT_C407714_MarcAuthority_${randomPostfix}, J. $c added`,
          };

          const authorityFields = [
            {
              tag: testData.tag010,
              content: authData.initial010Value,
              indicators: ['\\', '\\'],
            },
            {
              tag: testData.tag100,
              content: authData.initial100Content,
              indicators: ['1', '\\'],
            },
          ];

          const bibFields = [
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
              content: `$a AT_C407714_MarcAuthority_${randomPostfix}, $e author.`,
              indicators: ['1', '\\'],
            },
          ];

          const tag100AfterLinking = [
            bibFields[2].tag,
            bibFields[2].indicators[0],
            bibFields[2].indicators[1],
            authData.initial100Content,
            '$e author.',
            `$0 ${testData.sourceUrlPrefix}${testData.sourcePrefix}${testData.originalNaturalId}`,
            '',
          ];

          const tag100AfterUpdate = [
            bibFields[2].tag,
            bibFields[2].indicators[0],
            bibFields[2].indicators[1],
            authData.updated100Content,
            '$e author.',
            `$0 ${testData.sourceUrlPrefix}${testData.sourcePrefix}${testData.newNaturalId}`,
            '',
          ];

          let user;
          let createdInstanceId;
          let authorityId;

          before('Create users and data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407714_');
            InventoryInstances.deleteInstanceByTitleViaApi('C407714_');

            cy.then(() => {
              // Create local authority and bib in Member tenant (College)
              cy.setTenant(Affiliations.College);
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber,
                authorityFields,
              ).then((createdRecordId) => {
                authorityId = createdRecordId;
              });

              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );
            })
              .then(() => {
                cy.createTempUser(
                  [
                    Permissions.inventoryAll.gui,
                    Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                    Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                    Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                    Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
                    Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
                  ],
                  Affiliations.College,
                ).then((userProperties) => {
                  user = userProperties;
                });
              })
              .then(() => {
                cy.setTenant(Affiliations.College);
                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                  authRefresh: true,
                });
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              });
          });

          after('Delete users and data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);
            InventoryInstance.deleteInstanceViaApi(createdInstanceId);
            MarcAuthority.deleteViaAPI(authorityId, true);
            Users.deleteViaApi(user.userId);
          });

          it(
            'C407714 Update 010, 1XX in linked Local "MARC authority" record in Member tenant while Local "MARC Bib" record being edited in the same Member tenant (NOT saved link) (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C407714'] },
            () => {
              cy.then(() => {
                // Steps 1-2: Edit local MARC bib and start linking
                InventoryInstances.searchByTitle(createdInstanceId);
                InventoryInstances.selectInstanceById(createdInstanceId);
                InventoryInstance.waitLoading();
                InventoryInstance.waitInstanceRecordViewOpened();
                InventoryInstance.editMarcBibliographicRecord();
                QuickMarcEditor.waitLoading();
                InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
                MarcAuthorities.verifyBrowseTabIsOpened();
                MarcAuthoritiesSearch.verifySelectedSearchOption(testData.searchOption);
                MarcAuthorities.switchToSearch();
                MarcAuthorities.verifySearchTabIsOpened();

                // Steps 3-4: Link 100 field to local authority
                MarcAuthorities.searchByParameter(testData.searchOption, testData.authorityTitle);
                MarcAuthority.waitLoading();
                InventoryInstance.clickLinkButton();
                QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);
                QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...tag100AfterLinking);
              })
                .then(() => {
                  // Steps 5-9: User B edits authority (simulated via API)
                  // Update both 100 field content and 010 $a
                  cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
                    const field100 = marcData.fields.find((f) => f.tag === testData.tag100);
                    const field010 = marcData.fields.find((f) => f.tag === testData.tag010);
                    field100.content = authData.updated100Content;
                    field010.content = authData.updated010Value;
                    marcData.relatedRecordVersion = 1;
                    cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                      ({ status }) => {
                        expect(status).to.eq(202);
                      },
                    );
                  });
                })
                .then(() => {
                  // Step 10: Save & keep editing
                  QuickMarcEditor.clickSaveAndKeepEditing();

                  // Step 11: Verify linked field shows updated authority data
                  QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...tag100AfterUpdate);
                });
            },
          );
        });
      });
    });
  });
});
