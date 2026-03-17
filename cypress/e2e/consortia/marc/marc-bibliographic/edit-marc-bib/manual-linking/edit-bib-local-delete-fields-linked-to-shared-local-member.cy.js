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
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenuNavigation from '../../../../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();
          const randomLetters = getRandomLetters(15);
          const testData = {
            tag008: '008',
            tag100: '100',
            tag245: '245',
            tag600: '600',
            localPaneheaderText: 'Edit local MARC record',
            contributorAccordionName: 'Contributor',
            subjectAccordionName: 'Subject',
          };
          const bibTitle = `AT_C407686_MarcBibInstance_${randomPostfix}`;
          const authorityHeadingShared = `AT_C407686_MarcAuthority_${randomPostfix}_Shared`;
          const authorityHeadingLocal = `AT_C407686_MarcAuthority_${randomPostfix}_Local`;
          const authData = { prefix: randomLetters, startWithNumber: 1 };
          const authorityFieldsShared = [
            {
              tag: testData.tag100,
              content: `$a ${authorityHeadingShared}`,
              indicators: ['1', '\\'],
            },
          ];
          const authorityFieldsLocal = [
            {
              tag: testData.tag100,
              content: `$a ${authorityHeadingLocal}`,
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
              content: `$a ${bibTitle}`,
              indicators: ['1', '1'],
            },
            {
              tag: testData.tag100,
              content: '$a Field100',
              indicators: ['1', '\\'],
            },
            {
              tag: testData.tag600,
              content: '$a Field600',
              indicators: ['1', '0'],
            },
          ];
          const linkedFieldData100 = {
            tag: bibFields[2].tag,
            ind1: bibFields[2].indicators[0],
            ind2: bibFields[2].indicators[1],
            controlledLetterSubfields: `$a ${authorityHeadingShared}`,
            uncontrolledLetterSubfields: '',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
            uncontrolledDigitSubfields: '',
          };
          const linkedFieldData600 = {
            tag: bibFields[3].tag,
            ind1: bibFields[3].indicators[0],
            ind2: bibFields[3].indicators[1],
            controlledLetterSubfields: `$a ${authorityHeadingLocal}`,
            uncontrolledLetterSubfields: '',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber + 1}`,
            uncontrolledDigitSubfields: '',
          };
          const contributorValue = authorityHeadingShared;
          const subjectValue = authorityHeadingLocal;
          const userPremissionsCentralUniversity = [
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ];
          const userPremissionsCentralCollege = [
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ];

          let user;
          let createdInstanceId;
          let createdAuthorityIdShared;
          let createdAuthorityIdLocal;

          before('Create test data', () => {
            cy.then(() => {
              cy.resetTenant();
              cy.getAdminToken();
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C407686');
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C407686');

              cy.setTenant(Affiliations.College);
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C407686');
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C407686');
            })
              .then(() => {
                cy.resetTenant();
                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber,
                  authorityFieldsShared,
                ).then((createdRecordId) => {
                  createdAuthorityIdShared = createdRecordId;
                });
              })
              .then(() => {
                cy.setTenant(Affiliations.College);
                cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
                  (instanceId) => {
                    createdInstanceId = instanceId;
                  },
                );

                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  authData.startWithNumber + 1,
                  authorityFieldsLocal,
                ).then((createdRecordId) => {
                  createdAuthorityIdLocal = createdRecordId;
                });
              })
              .then(() => {
                cy.setTenant(Affiliations.College);
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: createdInstanceId,
                  authorityIds: [createdAuthorityIdShared, createdAuthorityIdLocal],
                  bibFieldTags: [linkedFieldData100.tag, linkedFieldData600.tag],
                  authorityFieldTags: [testData.tag100, testData.tag100],
                  finalBibFieldContents: [
                    linkedFieldData100.controlledLetterSubfields,
                    linkedFieldData600.controlledLetterSubfields,
                  ],
                });
              })
              .then(() => {
                cy.setTenant(Affiliations.College);
                cy.createTempUser(userPremissionsCentralCollege)
                  .then((createdUserProperties) => {
                    user = createdUserProperties;

                    cy.resetTenant();
                    cy.assignAffiliationToUser(Affiliations.University, user.userId);
                    cy.assignPermissionsToExistingUser(user.userId, userPremissionsCentralCollege);

                    cy.setTenant(Affiliations.University);
                    cy.assignPermissionsToExistingUser(
                      user.userId,
                      userPremissionsCentralUniversity,
                    );
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
          });

          after('Delete users, data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthority.deleteViaAPI(createdAuthorityIdShared, true);

            cy.setTenant(Affiliations.College);
            MarcAuthority.deleteViaAPI(createdAuthorityIdLocal, true);
            InventoryInstance.deleteInstanceViaApi(createdInstanceId);
            Users.deleteViaApi(user.userId);
          });

          it(
            'C407686 Delete linked fields from Local MARC bib linked with Shared/Local MARC authorities in Member tenant (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C407686'] },
            () => {
              InventorySearchAndFilter.clearDefaultHeldbyFilter();
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.checkPaneheaderContains(testData.localPaneheaderText);
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData100));
              QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(linkedFieldData600));

              QuickMarcEditor.deleteFieldByTagAndCheck(linkedFieldData100.tag);
              QuickMarcEditor.afterDeleteNotification(linkedFieldData100.tag);

              QuickMarcEditor.deleteFieldByTagAndCheck(linkedFieldData600.tag);
              QuickMarcEditor.afterDeleteNotification(linkedFieldData600.tag);

              QuickMarcEditor.clickSaveAndKeepEditingButton();
              QuickMarcEditor.checkDeleteModal(2);
              QuickMarcEditor.confirmDelete();
              QuickMarcEditor.checkAfterSaveAndKeepEditing();
              QuickMarcEditor.checkDeleteModalClosed();
              QuickMarcEditor.checkTagAbsent(linkedFieldData100.tag);
              QuickMarcEditor.checkTagAbsent(linkedFieldData600.tag);
              QuickMarcEditor.checkNoDeletePlaceholder();

              QuickMarcEditor.close();
              InventoryInstance.verifyInstanceTitle(bibTitle);
              InventoryInstance.checkValueAbsenceInDetailView(
                testData.contributorAccordionName,
                contributorValue,
              );
              InventoryInstance.checkValueAbsenceInDetailView(
                testData.subjectAccordionName,
                subjectValue,
              );

              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();

              MarcAuthorities.searchBeats(authorityHeadingShared);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeadingShared, '');

              MarcAuthorities.searchBeats(authorityHeadingLocal);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeadingLocal, '');

              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
              MarcAuthorities.waitLoading();

              MarcAuthorities.searchBeats(authorityHeadingShared);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeadingShared, '');

              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              MarcAuthorities.waitLoading();

              MarcAuthorities.searchBeats(authorityHeadingShared);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeadingShared, '');
            },
          );
        });
      });
    });
  });
});
