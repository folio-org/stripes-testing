import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../../../support/constants';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();
          const randomDigits = `407679${randomNDigitNumber(10)}`;

          const testData = {
            tag100: '100',
            tag010: '010',
            tag245: '245',
            tag008: '008',
            bibTitle: `AT_C407679_MarcBibInstance_${randomPostfix}`,
            authorityTitle: `AT_C407679_MarcAuthority_${randomPostfix} 1922-1969`,
            contributorName: `AT_C407679_MarcAuthority_${randomPostfix}`,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
            sharedLabel: 'Shared',
            sourcePrefix: '',
          };

          const authData = {
            prefix: testData.sourcePrefix,
            startWithNumber: randomDigits,
            original100Content: `$a AT_C407679_MarcAuthority_${randomPostfix} $d 1922-1969`,
          };

          const authorityFields = [
            {
              tag: testData.tag100,
              content: authData.original100Content,
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
              content: `$a AT_C407679_MarcAuthority_${randomPostfix}, $e author.`,
              indicators: ['1', '\\'],
            },
          ];

          const tag100AfterLinking = [
            bibFields[2].tag,
            bibFields[2].indicators[0],
            bibFields[2].indicators[1],
            authData.original100Content,
            '$e author.',
            `$0 ${authData.prefix}${authData.startWithNumber}`,
            '',
          ];

          const originalBibContent = `$a AT_C407679_MarcAuthority_${randomPostfix}, $e author.`;

          let user;
          let createdInstanceId;
          let authorityId;

          before('Create users and data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407679_');
            InventoryInstances.deleteInstanceByTitleViaApi('C407679_');

            cy.then(() => {
              // Create shared authority in Central
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber,
                authorityFields,
              ).then((createdRecordId) => {
                authorityId = createdRecordId;
              });
            })
              .then(() => {
                // Create local bib in Member 1 (College)
                cy.setTenant(Affiliations.College);
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
                    Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                    Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                    Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
                  ],
                  Affiliations.College,
                ).then((userProperties) => {
                  user = userProperties;
                });
              })
              .then(() => {
                cy.resetTenant();
                cy.assignPermissionsToExistingUser(user.userId, [
                  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                  Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                  Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
                ]);
              })
              .then(() => {
                cy.assignAffiliationToUser(Affiliations.University, user.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(user.userId, [
                  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                  Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                  Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
                ]);
              })
              .then(() => {
                cy.setTenant(Affiliations.College);
                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              });
          });

          after('Delete users and data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthority.deleteViaAPI(authorityId, true);
            cy.setTenant(Affiliations.College);
            InventoryInstance.deleteInstanceViaApi(createdInstanceId);
            Users.deleteViaApi(user.userId);
          });

          it(
            'C407679 Add "$t" to a field in shared linked "MARC Authority" record in Member tenant while local "MARC Bib" record being edited in another Member tenant (NOT saved link) (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C407679'] },
            () => {
              cy.then(() => {
                // Steps 1-2: Edit local MARC bib in Member 1 and start linking
                InventorySearchAndFilter.clearDefaultHeldbyFilter();
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

                // Steps 3-4: Link 100 field to shared authority
                MarcAuthorities.searchByParameter(testData.searchOption, testData.authorityTitle);
                MarcAuthority.waitLoading();
                InventoryInstance.clickLinkButton();
                QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);
                QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...tag100AfterLinking);
              })
                .then(() => {
                  // Steps 5-8: Edit authority (add $t subfield)
                  cy.resetTenant();
                  cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
                    const field100 = marcData.fields.find((f) => f.tag === testData.tag100);
                    field100.content = `${authData.original100Content} $t test`;
                    cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                      ({ status }) => {
                        expect(status).to.eq(202);
                      },
                    );
                  });
                })
                .then(() => {
                  // Steps 9-10: In Member 1, Save & keep editing, verify link broken
                  cy.setTenant(Affiliations.College);
                  QuickMarcEditor.clickSaveAndKeepEditing();
                  QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
                    testData.tag100,
                    '1',
                    '\\',
                    originalBibContent,
                  );

                  // Step 10: Close editor
                  QuickMarcEditor.close();
                  InventoryInstance.waitLoading();
                  InventoryInstance.waitInstanceRecordViewOpened();
                  InventoryInstance.verifyContributor(0, 1, testData.contributorName);

                  // Step 11: View source - verify no authority icon
                  InventoryInstance.viewSource();
                  InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tag100, false);
                  InventoryViewSource.checkRowExistsWithTagAndValue(
                    testData.tag100,
                    originalBibContent,
                  );
                });
            },
          );
        });
      });
    });
  });
});
