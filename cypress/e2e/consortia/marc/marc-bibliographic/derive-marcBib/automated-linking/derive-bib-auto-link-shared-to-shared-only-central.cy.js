import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { getRandomLetters } from '../../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import {
  MARC_AUTHORITY_BROWSE_OPTIONS,
  APPLICATION_NAMES,
} from '../../../../../../support/constants';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenuNavigation from '../../../../../../support/fragments/topMenuNavigation';
import InventoryViewSource from '../../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Automated linking', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();
          const randomLetters = getRandomLetters(15);
          const testData = {
            sharedPaneheaderText: 'Derive a new shared MARC bib record',
            authorityBrowseOption: MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
            contributorSectionId: 'list-contributors',
          };
          const automatedLinkingCallouts = [
            'Field 100 has been linked to MARC authority record(s).',
            'Field 700 must be set manually by selecting the link icon.',
          ];
          const bibTitle = `AT_C407004_MarcBibInstance_${randomPostfix}`;
          const authorityHeadingShared1 = `AT_C407004_MarcAuthority_${randomPostfix}_Shared1`;
          const authorityHeadingShared2 = `AT_C407004_MarcAuthority_${randomPostfix}_Shared2`;
          const authorityHeadingLocal = `AT_C407004_MarcAuthority_${randomPostfix}_Local`;
          const authData = { prefix: randomLetters, startWithNumber: 1 };
          const authorityFieldsShared1 = [
            {
              tag: '150',
              content: `$a ${authorityHeadingShared1}`,
              indicators: ['\\', '\\'],
            },
          ];
          const authorityFieldsShared2 = [
            {
              tag: '100',
              content: `$a ${authorityHeadingShared2}`,
              indicators: ['1', '\\'],
            },
          ];
          const authorityFieldsLocal = [
            {
              tag: '100',
              content: `$a ${authorityHeadingLocal}`,
              indicators: ['1', '\\'],
            },
          ];
          const bibFields = [
            {
              tag: '008',
              content: QuickMarcEditor.valid008ValuesInstance,
            },
            {
              tag: '245',
              content: `$a ${bibTitle}`,
              indicators: ['1', '1'],
            },
            {
              tag: '100',
              content: `$a Field100 $0 ${authData.prefix}${authData.startWithNumber + 1}`,
              indicators: ['1', '\\'],
            },
            {
              tag: '650',
              content: `$a Field650 $0 ${authData.prefix}${authData.startWithNumber}`,
              indicators: ['0', '\\'],
            },
            {
              tag: '700',
              content: `$a Field700 $0 ${authData.prefix}${authData.startWithNumber + 2}`,
              indicators: ['1', '\\'],
            },
          ];
          const linkedFieldData650 = {
            tag: bibFields[3].tag,
            ind1: bibFields[3].indicators[0],
            ind2: bibFields[3].indicators[1],
            controlledLetterSubfields: `$a ${authorityHeadingShared1}`,
            uncontrolledLetterSubfields: '',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
            uncontrolledDigitSubfields: '',
          };
          const userPermissionsCentral = [
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ];
          const userPermissionsCollege = [
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ];
          const contributorValueLinked = authorityHeadingShared2;
          const contributorValueNotLinked = 'Field700';

          let user;
          let createdInstanceId;
          const createdAuthorityIdsCentral = [];
          let createdAuthorityIdCollege;

          before('Create test data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C407004');
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C407004');

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
                  authorityFieldsShared1,
                ).then((createdRecordId) => {
                  createdAuthorityIdsCentral.push(createdRecordId);
                });

                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber + 1,
                  authorityFieldsShared2,
                ).then((createdRecordId) => {
                  createdAuthorityIdsCentral.push(createdRecordId);
                });
              })
                .then(() => {
                  cy.setTenant(Affiliations.College);
                  MarcAuthorities.createMarcAuthorityViaAPI(
                    authData.prefix,
                    authData.startWithNumber + 2,
                    authorityFieldsLocal,
                  ).then((createdRecordId) => {
                    createdAuthorityIdCollege = createdRecordId;
                  });
                })
                .then(() => {
                  cy.resetTenant();
                  QuickMarcEditor.linkMarcRecordsViaApi({
                    bibId: createdInstanceId,
                    authorityIds: [createdAuthorityIdsCentral[0]],
                    bibFieldTags: [linkedFieldData650.tag],
                    authorityFieldTags: [authorityFieldsShared1[0].tag],
                    finalBibFieldContents: [linkedFieldData650.controlledLetterSubfields],
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
                  });
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                });
            });
          });

          after('Delete users, data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            createdAuthorityIdsCentral.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
            InventoryInstances.deleteInstanceByTitleViaApi(bibTitle);
            Users.deleteViaApi(user.userId);

            cy.setTenant(Affiliations.College);
            MarcAuthority.deleteViaAPI(createdAuthorityIdCollege, true);
          });

          it(
            'C407004 Verify that fields of Shared MARC bib will be linked only with Shared MARC authority records automatically when linking on Central tenant from Derive screen (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C407004'] },
            () => {
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.deriveNewMarcBibRecord();
              QuickMarcEditor.checkPaneheaderContains(testData.sharedPaneheaderText);
              QuickMarcEditor.verifyRemoveLinkingModal();

              QuickMarcEditor.clickKeepLinkingButton();
              QuickMarcEditor.verifyRemoveLinkingModalAbsence();
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData650));

              QuickMarcEditor.clickLinkHeadingsButton();
              automatedLinkingCallouts.forEach((callout) => {
                QuickMarcEditor.checkCallout(callout);
              });
              QuickMarcEditor.verifyEnabledLinkHeadingsButton();

              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkAfterSaveAndCloseDerive();
              InventoryInstance.verifyInstanceTitle(bibTitle);

              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              InventoryInstances.waitContentLoading();

              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();

              MarcAuthorities.searchBeats(authorityHeadingLocal);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeadingLocal, '');

              MarcAuthorities.searchBeats(authorityHeadingShared2);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeadingShared2, '1');
              MarcAuthorities.clickNumberOfTitlesByHeading(authorityHeadingShared2);
              InventoryInstances.waitLoading();
              InventoryInstance.verifyInstanceTitle(bibTitle);
              InventoryInstance.checkAuthorityAppIconInSection(
                testData.contributorSectionId,
                contributorValueLinked,
                true,
              );
              InventoryInstance.checkAuthorityAppIconInSection(
                testData.contributorSectionId,
                contributorValueNotLinked,
                false,
              );

              InventoryInstance.viewSource();
              InventoryViewSource.verifyLinkedToAuthorityIconByTag('100');
              InventoryViewSource.verifyLinkedToAuthorityIconByTag('650');
            },
          );
        });
      });
    });
  });
});
