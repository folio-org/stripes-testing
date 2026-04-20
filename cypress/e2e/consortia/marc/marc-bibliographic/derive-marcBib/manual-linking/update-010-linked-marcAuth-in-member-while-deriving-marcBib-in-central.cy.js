import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../../support/fragments/inventory/inventoryViewSource';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();
          const randomDigits = `407671${randomNDigitNumber(10)}`;

          const testData = {
            tag100: '100',
            tag010: '010',
            tag245: '245',
            tag008: '008',
            bibTitle: `AT_C407671_MarcBibInstance_${randomPostfix}`,
            derivedBibTitle: `AT_C407671_MarcBibInstance_Derived_${randomPostfix}`,
            authorityTitle: `AT_C407671_MarcAuthority_${randomPostfix}`,
            searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
            sharedLabel: 'Shared',
            sourceUrlPrefix: 'http://id.loc.gov/authorities/names/',
            sourcePrefix: 'n',
          };

          const authData = {
            prefix: '',
            startWithNumber: randomDigits,
            initial010Value: `$a ${testData.sourcePrefix}407671${randomDigits}`,
            updated010Value: `$a ${testData.sourcePrefix}407671${randomDigits}2`,
          };

          const authorityFields = [
            {
              tag: testData.tag010,
              content: authData.initial010Value,
              indicators: ['\\', '\\'],
            },
            {
              tag: testData.tag100,
              content: `$a ${testData.authorityTitle}`,
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
              content: `$a ${testData.authorityTitle} $e author.`,
              indicators: ['1', '\\'],
            },
          ];

          const tag100BeforeLinking = [
            bibFields[2].tag,
            bibFields[2].indicators[0],
            bibFields[2].indicators[1],
            bibFields[2].content,
          ];

          const tag100AfterLinking = [
            bibFields[2].tag,
            bibFields[2].indicators[0],
            bibFields[2].indicators[1],
            `$a ${testData.authorityTitle}`,
            '$e author.',
            `$0 ${testData.sourceUrlPrefix}${authData.initial010Value.replace('$a ', '')}`,
            '',
          ];

          let user;
          let createdInstanceId;
          let authorityId;

          before('Create users and data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407671');
            InventoryInstances.deleteInstanceByTitleViaApi('C407671');

            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            ])
              .then((userProperties) => {
                user = userProperties;

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
                cy.assignAffiliationToUser(Affiliations.College, user.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(user.userId, [
                  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                  Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                  Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
                ]);
              })
              .then(() => {
                cy.resetTenant();
                cy.assignAffiliationToUser(Affiliations.University, user.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(user.userId, [
                  Permissions.inventoryAll.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
                ]);
              });
          });

          after('Delete users and data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            Users.deleteViaApi(user.userId);
            InventoryInstances.deleteInstanceByTitleViaApi('C407671');
            MarcAuthority.deleteViaAPI(authorityId, true);
          });

          it(
            'C407671 Update "010 $a" in linked "MARC Authority" record in Member tenant while "MARC Bib" record being derived in Central tenant (NOT saved link) (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C407671'] },
            () => {
              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

              // Step 1: Open derive screen for the shared MARC Bib record
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.deriveNewMarcBibRecord();
              QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(...tag100BeforeLinking);
              QuickMarcEditor.updateExistingField(
                testData.tag245,
                `$a ${testData.derivedBibTitle}`,
              );
              QuickMarcEditor.checkContentByTag(testData.tag245, `$a ${testData.derivedBibTitle}`);

              // Step 2: Click link icon on 100 field
              InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
              MarcAuthorities.verifyBrowseTabIsOpened();
              MarcAuthoritiesSearch.verifySelectedSearchOption(testData.searchOption);

              // Step 3: Find and select the shared authority
              MarcAuthorities.searchByParameter(testData.searchOption, testData.authorityTitle);
              MarcAuthorities.checkRow(`${testData.sharedLabel}${testData.authorityTitle}`);

              // Step 4: Link the authority
              MarcAuthorities.selectIncludingTitle(testData.authorityTitle);
              MarcAuthority.waitLoading();
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...tag100AfterLinking);

              // Steps 5-8 (Via API - updating authority's 010 $a)
              cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
                const field010 = marcData.fields.find((f) => f.tag === testData.tag010);
                field010.content = authData.updated010Value;
                cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                  ({ status }) => {
                    expect(status).to.eq(202);
                  },
                );
              });

              // Step 9: Save & close the derived MARC bib in Central
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndCloseDerive();
              InventoryInstance.waitLoading();

              // Step 10: View source - 100 field has updated $0 with new 010 $a value and MARC Authority icon
              InventoryInstance.viewSource();
              InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tag100, true);
              InventoryViewSource.checkRowExistsWithTagAndValue(
                testData.tag100,
                `$0 ${testData.sourceUrlPrefix}${authData.updated010Value.replace('$a ', '')}`,
              );
              InventoryViewSource.close();
              InventoryInstance.waitLoading();

              // Steps 11-12: Switch to Member 2 affiliation
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              InventoryInstances.waitContentLoading();

              // Steps 13-14: Find and verify the derived record in Member 2
              InventorySearchAndFilter.clearDefaultHeldbyFilter();
              InventoryInstances.searchByTitle(testData.derivedBibTitle);
              InventoryInstances.selectInstanceByTitle(testData.derivedBibTitle);
              InventoryInstance.waitLoading();
              InventoryInstance.viewSource();
              InventoryViewSource.verifyLinkedToAuthorityIconByTag(testData.tag100, true);
              InventoryViewSource.checkRowExistsWithTagAndValue(
                testData.tag100,
                `$0 ${testData.sourceUrlPrefix}${authData.updated010Value.replace('$a ', '')}`,
              );
            },
          );
        });
      });
    });
  });
});
