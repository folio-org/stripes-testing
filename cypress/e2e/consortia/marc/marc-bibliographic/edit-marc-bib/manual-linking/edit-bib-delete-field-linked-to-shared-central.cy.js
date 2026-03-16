import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { getRandomLetters } from '../../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import { APPLICATION_NAMES } from '../../../../../../support/constants';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenuNavigation from '../../../../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();
          const randomLetters = getRandomLetters(15);
          const sharedPaneheaderText = 'Edit shared MARC record';
          const tags = {
            tag008: '008',
            tag100: '100',
            tag245: '245',
          };
          const bibTitle = `AT_C407684_MarcBibInstance_${randomPostfix}`;
          const authorityHeading = `AT_C407684_MarcAuthority_${randomPostfix}`;
          const bibNotControllableSubfield = '$e narrative designer';
          const authData = { prefix: randomLetters, startWithNumber: 1 };
          const authorityFields1 = [
            {
              tag: tags.tag100,
              content: `$a ${authorityHeading}`,
              indicators: ['1', '\\'],
            },
          ];
          const bibFields = [
            {
              tag: tags.tag008,
              content: QuickMarcEditor.valid008ValuesInstance,
            },
            {
              tag: tags.tag245,
              content: `$a ${bibTitle}`,
              indicators: ['1', '1'],
            },
            {
              tag: tags.tag100,
              content: `${authorityFields1[0].content} ${bibNotControllableSubfield}`,
              indicators: ['1', '\\'],
            },
          ];
          const linkedFieldData = {
            tag: bibFields[2].tag,
            ind1: bibFields[2].indicators[0],
            ind2: bibFields[2].indicators[1],
            controlledLetterSubfields: `$a ${authorityHeading}`,
            uncontrolledLetterSubfields: bibNotControllableSubfield,
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
            uncontrolledDigitSubfields: '',
          };
          const userPermissionsCentral = [
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ];
          const userPermissionsCollege = [
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ];

          let user;
          let createdInstanceId;
          let createdAuthorityId;

          before('Create test data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C407684');
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C407684');

            cy.createTempUser(userPermissionsCentral).then((createdUserProperties) => {
              user = createdUserProperties;

              cy.assignAffiliationToUser(Affiliations.College, user.userId);

              cy.then(() => {
                cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
                  (instanceId) => {
                    createdInstanceId = instanceId;
                  },
                );

                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber,
                  authorityFields1,
                ).then((createdRecordId) => {
                  createdAuthorityId = createdRecordId;
                });
              })
                .then(() => {
                  QuickMarcEditor.linkMarcRecordsViaApi({
                    bibId: createdInstanceId,
                    authorityIds: [createdAuthorityId],
                    bibFieldTags: [tags.tag100],
                    authorityFieldTags: [tags.tag100],
                    finalBibFieldContents: [
                      `${authorityFields1[0].content} ${bibNotControllableSubfield}`,
                    ],
                  });
                })
                .then(() => {
                  cy.setTenant(Affiliations.College);
                  cy.assignPermissionsToExistingUser(user.userId, userPermissionsCollege);
                })
                .then(() => {
                  cy.resetTenant();
                  cy.login(user.username, user.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                    authRefresh: true,
                  });
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                });
            });
          });

          after('Delete users, data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthority.deleteViaAPI(createdAuthorityId);
            InventoryInstance.deleteInstanceViaApi(createdInstanceId);
            Users.deleteViaApi(user.userId);
          });

          it(
            'C407684 Delete linked field from Shared MARC bib linked with Shared MARC authority in Central tenant (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C407684'] },
            () => {
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.checkPaneheaderContains(sharedPaneheaderText);
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData));

              QuickMarcEditor.deleteFieldByTagAndCheck(linkedFieldData.tag);
              QuickMarcEditor.afterDeleteNotification(linkedFieldData.tag);

              QuickMarcEditor.clickSaveAndKeepEditingButton();
              QuickMarcEditor.checkDeleteModal(1);
              QuickMarcEditor.confirmDelete();
              QuickMarcEditor.checkAfterSaveAndKeepEditing();
              QuickMarcEditor.checkDeleteModalClosed();
              QuickMarcEditor.checkTagAbsent(linkedFieldData.tag);
              QuickMarcEditor.checkNoDeletePlaceholder();

              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              InventoryInstances.waitContentLoading();

              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.checkTagAbsent(linkedFieldData.tag);

              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();

              MarcAuthorities.searchBeats(authorityHeading);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeading, '');
            },
          );
        });
      });
    });
  });
});
