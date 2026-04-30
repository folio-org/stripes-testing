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

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();
          const randomDigits = `407674${randomNDigitNumber(10)}`;

          const testData = {
            tag100: '100',
            tag110: '110',
            tag010: '010',
            tag245: '245',
            tag008: '008',
            bibTitle: `AT_C407674_MarcBibInstance_${randomPostfix}`,
            authorityTitle: `AT_C407674_MarcAuthority_${randomPostfix} 1922-1969`,
            contributorName: `AT_C407674_MarcAuthority_${randomPostfix}`,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
            sharedLabel: 'Shared',
            sourcePrefix: '',
          };

          const authData = {
            prefix: testData.sourcePrefix,
            startWithNumber: randomDigits,
            original100Content: `$a AT_C407674_MarcAuthority_${randomPostfix} $d 1922-1969`,
          };

          const authorityFields = [
            {
              tag: testData.tag010,
              content: `$a ${authData.prefix}${authData.startWithNumber}`,
              indicators: ['\\', '\\'],
            },
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
              content: `$a AT_C407674_MarcAuthority_${randomPostfix} $e author.`,
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

          const originalBibContent = `$a AT_C407674_MarcAuthority_${randomPostfix} $e author.`;

          let user;
          let createdInstanceId;
          let authorityId;

          before('Create users and data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407674_');
            InventoryInstances.deleteInstanceByTitleViaApi('C407674_');

            cy.then(() => {
              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );

              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                authData.startWithNumber,
                authorityFields,
              ).then((createdRecordId) => {
                authorityId = createdRecordId;
              });
            })
              .then(() => {
                cy.setTenant(Affiliations.College);
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
                  Permissions.inventoryAll.gui,
                  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                  Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                  Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
                  Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
                ]);
              })
              .then(() => {
                cy.assignAffiliationToUser(Affiliations.University, user.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(user.userId, [
                  Permissions.inventoryAll.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                ]);
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
            InventoryInstance.deleteInstanceViaApi(createdInstanceId);
            MarcAuthority.deleteViaAPI(authorityId, true);
            cy.setTenant(Affiliations.College);
            Users.deleteViaApi(user.userId);
          });

          it(
            'C407674 Update field tag in linked "MARC Authority" record in Central tenant while "MARC Bib" record being edited in Member tenant (NOT saved link) (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C407674'] },
            () => {
              cy.then(() => {
                // Step 1: Edit MARC bib record in Member 1
                InventoryInstances.searchByTitle(createdInstanceId);
                InventoryInstances.selectInstanceById(createdInstanceId);
                InventoryInstance.waitLoading();
                InventoryInstance.waitInstanceRecordViewOpened();
                InventoryInstance.editMarcBibliographicRecord();
                QuickMarcEditor.waitLoading();

                // Steps 2-4: Link 100 field to authority
                InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
                MarcAuthorities.verifyBrowseTabIsOpened();
                MarcAuthoritiesSearch.verifySelectedSearchOption(testData.searchOption);
                MarcAuthorities.switchToSearch();
                MarcAuthorities.verifySearchTabIsOpened();
                MarcAuthorities.searchByParameter(testData.searchOption, testData.authorityTitle);
                MarcAuthority.waitLoading();
                InventoryInstance.clickLinkButton();
                QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);
                QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...tag100AfterLinking);
              })
                .then(() => {
                  cy.resetTenant();
                  // Steps 5-8: Update authority tag from 100 to 110 via API (simulating Central edit)
                  cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
                    const field100 = marcData.fields.find((f) => f.tag === testData.tag100);
                    field100.tag = testData.tag110;
                    marcData.relatedRecordVersion = 1;
                    cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                      ({ status }) => {
                        expect(status).to.eq(202);
                      },
                    );
                  });
                })
                .then(() => {
                  cy.setTenant(Affiliations.College);
                  // Step 9: Save & close the MARC bib in Member 1
                  QuickMarcEditor.pressSaveAndClose();
                  QuickMarcEditor.checkAfterSaveAndClose();
                  InventoryInstance.waitLoading();
                  InventoryInstance.waitInstanceRecordViewOpened();

                  // Step 9: Verify contributor WITHOUT link icon (link broken)
                  InventoryInstance.checkContributor(testData.contributorName);

                  // Step 10: View source in Member 1 - verify no authority icon
                  InventoryInstance.viewSource();
                  InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tag100, false);
                  InventoryViewSource.checkRowExistsWithTagAndValue(
                    testData.tag100,
                    originalBibContent,
                  );
                  InventoryViewSource.close();
                  InventoryInstance.waitLoading();

                  // Steps 11-12: Switch to Member 2 tenant
                  ConsortiumManager.switchActiveAffiliation(
                    tenantNames.college,
                    tenantNames.university,
                  );
                  InventoryInstances.waitContentLoading();

                  // Step 13: Find and verify the record in Member 2
                  InventoryInstances.searchByTitle(testData.bibTitle);
                  InventoryInstances.selectInstanceByTitle(testData.bibTitle);
                  InventoryInstance.waitLoading();
                  InventoryInstance.waitInstanceRecordViewOpened();
                  InventoryInstance.checkContributor(testData.contributorName);

                  // Step 14: View source in Member 2 - verify no authority icon
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
