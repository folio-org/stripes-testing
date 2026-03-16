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
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Automated linking', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();
          const randomLetters = getRandomLetters(15);
          const testData = {
            localPaneheaderText: 'Derive a new local MARC bib record',
            authorityBrowseOption: MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
            contributorSectionId: 'list-contributors',
            subjectSectionId: 'list-subject',
            heldbyAccordionName: 'Held by',
          };
          const tags = {
            tag008: '008',
            tag245: '245',
            tag100: '100',
            tag110: '110',
            tag600: '600',
            tag700: '700',
            tag710: '710',
          };
          const automatedLinkingCallouts = [
            'Field 600 and 700 has been linked to MARC authority record(s).',
            'Field 710 must be set manually by selecting the link icon.',
          ];
          const bibTitle = `AT_C410750_MarcBibInstance_${randomPostfix}`;
          const bibTag100LetterSubfields = { a: 'Field100', e: 'author' };
          const bibTag600LetterSubfields = { a: 'Field600', x: 'Assassination' };
          const bibTag700LetterSubfields = { a: 'Field700' };
          const bibTag710LetterSubfields = { a: 'Field710' };
          const updatedBibTitle = `${bibTitle} upd`;
          const authorityHeadingShared1 = `AT_C410750_MarcAuthority_${randomPostfix}_Shared1`;
          const authorityHeadingShared2 = `AT_C410750_MarcAuthority_${randomPostfix}_Shared2`;
          const authorityHeadingCollege = `AT_C410750_MarcAuthority_${randomPostfix}_College`;
          const authorityHeadingUniversity = `AT_C410750_MarcAuthority_${randomPostfix}_University`;
          const authData = { prefix: randomLetters, startWithNumber: 1 };
          const authorityFieldsShared1 = [
            {
              tag: tags.tag100,
              content: `$a ${authorityHeadingShared1}`,
              indicators: ['1', '\\'],
            },
          ];
          const authorityFieldsShared2 = [
            {
              tag: tags.tag100,
              content: `$a ${authorityHeadingShared2}`,
              indicators: ['1', '\\'],
            },
          ];
          const authorityFieldsCollege = [
            {
              tag: tags.tag100,
              content: `$a ${authorityHeadingCollege}`,
              indicators: ['1', '\\'],
            },
          ];
          const authorityFieldsUniversity = [
            {
              tag: tags.tag110,
              content: `$a ${authorityHeadingUniversity}`,
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
              content: `$a ${bibTag100LetterSubfields.a} $e ${bibTag100LetterSubfields.e}`,
              indicators: ['1', '\\'],
            },
            {
              tag: tags.tag600,
              content: `$a ${bibTag600LetterSubfields.a} $x ${bibTag600LetterSubfields.x} $0 ${authData.prefix}${authData.startWithNumber + 1}`,
              indicators: ['1', '\\'],
            },
            {
              tag: tags.tag700,
              content: `$a ${bibTag700LetterSubfields.a} $0 ${authData.prefix}${authData.startWithNumber + 2}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: tags.tag710,
              content: `$a ${bibTag710LetterSubfields.a} $0 ${authData.prefix}${authData.startWithNumber + 3}`,
              indicators: ['\\', '\\'],
            },
          ];
          const linkedFieldData100 = {
            tag: bibFields[2].tag,
            ind1: bibFields[2].indicators[0],
            ind2: bibFields[2].indicators[1],
            controlledLetterSubfields: `$a ${authorityHeadingShared1}`,
            uncontrolledLetterSubfields: `$e ${bibTag100LetterSubfields.e}`,
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
            uncontrolledDigitSubfields: '',
          };
          const linkedFieldData600 = {
            tag: bibFields[3].tag,
            ind1: bibFields[3].indicators[0],
            ind2: bibFields[3].indicators[1],
            controlledLetterSubfields: `$a ${authorityHeadingShared2}`,
            uncontrolledLetterSubfields: `$x ${bibTag600LetterSubfields.x}`,
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber + 1}`,
            uncontrolledDigitSubfields: '',
          };
          const linkedFieldData700 = {
            tag: bibFields[4].tag,
            ind1: bibFields[4].indicators[0],
            ind2: bibFields[4].indicators[1],
            controlledLetterSubfields: `$a ${authorityHeadingCollege}`,
            uncontrolledLetterSubfields: '',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber + 2}`,
            uncontrolledDigitSubfields: '',
          };
          const userPermissionsCollege = [
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ];
          const userPermissionsCentralUniversity = [
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          ];
          const contributorValuesLinked = [authorityHeadingShared1, authorityHeadingCollege];
          const contributorValueAbsent = authorityHeadingUniversity;
          const subjectValueLinked = `${authorityHeadingShared2}--${bibTag600LetterSubfields.x}`;

          let user;
          let createdInstanceId;
          const createdAuthorityIdsCentral = [];
          let createdAuthorityIdCollege;
          let createdAuthorityIdUniversity;

          before('Create test data', () => {
            cy.then(() => {
              cy.resetTenant();
              cy.getAdminToken();
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C410750');
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C410750');

              cy.setTenant(Affiliations.College);
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C410750');
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C410750');

              cy.createTempUser(userPermissionsCollege).then((createdUserProperties) => {
                user = createdUserProperties;

                cy.resetTenant();
                cy.assignAffiliationToUser(Affiliations.University, user.userId);
                cy.assignPermissionsToExistingUser(user.userId, userPermissionsCentralUniversity);

                cy.setTenant(Affiliations.University);
                MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C410750');

                cy.assignPermissionsToExistingUser(user.userId, userPermissionsCentralUniversity);
              });
            })
              .then(() => {
                cy.resetTenant();
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
                  authorityFieldsCollege,
                ).then((createdRecordId) => {
                  createdAuthorityIdCollege = createdRecordId;
                });
              })
              .then(() => {
                cy.setTenant(Affiliations.University);
                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber + 3,
                  authorityFieldsUniversity,
                ).then((createdRecordId) => {
                  createdAuthorityIdUniversity = createdRecordId;
                });
              })
              .then(() => {
                cy.resetTenant();
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: createdInstanceId,
                  authorityIds: [createdAuthorityIdsCentral[0]],
                  bibFieldTags: [linkedFieldData100.tag],
                  authorityFieldTags: [authorityFieldsShared1[0].tag],
                  finalBibFieldContents: [
                    `${linkedFieldData100.controlledLetterSubfields} $e ${bibTag100LetterSubfields.e}`,
                  ],
                });
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

          after('Delete users, data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            createdAuthorityIdsCentral.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
            InventoryInstances.deleteInstanceByTitleViaApi(bibTitle);

            cy.setTenant(Affiliations.College);
            MarcAuthority.deleteViaAPI(createdAuthorityIdCollege, true);
            InventoryInstances.deleteInstanceByTitleViaApi(bibTitle);
            Users.deleteViaApi(user.userId);

            cy.setTenant(Affiliations.University);
            MarcAuthority.deleteViaAPI(createdAuthorityIdUniversity, true);
          });

          it(
            'C410750 Auto-Link Local MARC bib with Shared/Local MARC auth on Member tenant in Derive screen (derived from Shared) (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C410750'] },
            () => {
              InventorySearchAndFilter.clearDefaultFilter(testData.heldbyAccordionName);
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.deriveNewMarcBibRecord();
              QuickMarcEditor.checkPaneheaderContains(testData.localPaneheaderText);
              QuickMarcEditor.verifyRemoveLinkingModal();

              QuickMarcEditor.clickKeepLinkingButton();
              QuickMarcEditor.verifyRemoveLinkingModalAbsence();
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData100));

              QuickMarcEditor.clickLinkHeadingsButton();
              automatedLinkingCallouts.forEach((callout) => {
                QuickMarcEditor.checkCallout(callout);
              });
              QuickMarcEditor.verifyEnabledLinkHeadingsButton();
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData600));
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData700));
              QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
                bibFields[5].tag,
                bibFields[5].indicators[0],
                bibFields[5].indicators[1],
                bibFields[5].content,
              );

              QuickMarcEditor.updateExistingField(bibFields[1].tag, updatedBibTitle);
              QuickMarcEditor.checkContentByTag(bibFields[1].tag, updatedBibTitle);

              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkAfterSaveAndCloseDerive();
              InventoryInstance.verifyInstanceTitle(updatedBibTitle);
              contributorValuesLinked.forEach((contributorValue) => {
                InventoryInstance.checkAuthorityAppIconInSection(
                  testData.contributorSectionId,
                  contributorValue,
                  true,
                );
              });
              InventoryInstance.verifyContributorAbsent(contributorValueAbsent);
              InventoryInstance.checkAuthorityAppIconInSection(
                testData.subjectSectionId,
                subjectValueLinked,
                true,
              );

              ConsortiumManager.switchActiveAffiliation(
                tenantNames.college,
                tenantNames.university,
              );
              InventoryInstances.waitContentLoading();

              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();

              MarcAuthorities.searchBeats(authorityHeadingUniversity);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeadingUniversity, '');

              ConsortiumManager.switchActiveAffiliation(
                tenantNames.university,
                tenantNames.central,
              );
              MarcAuthorities.waitLoading();

              MarcAuthorities.searchBeats(authorityHeadingShared2);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeadingShared2, '');
            },
          );
        });
      });
    });
  });
});
