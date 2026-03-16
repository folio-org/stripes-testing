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
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';

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
            tag151: '151',
            tag245: '245',
            tag651: '651',
          };
          const subjectAccordionName = 'Subject';
          const bibTitle = `AT_C407685_MarcBibInstance_${randomPostfix}`;
          const authorityHeading = `AT_C407685_MarcAuthority_${randomPostfix}`;
          const authData = { prefix: randomLetters, startWithNumber: 1 };
          const authorityFields = [
            {
              tag: tags.tag151,
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
              tag: tags.tag651,
              content: authorityFields[0].content,
              indicators: ['\\', '\\'],
            },
          ];
          const linkedFieldData = {
            tag: bibFields[2].tag,
            ind1: bibFields[2].indicators[0],
            ind2: bibFields[2].indicators[1],
            controlledLetterSubfields: `$a ${authorityHeading}`,
            uncontrolledLetterSubfields: '',
            controlledDigitSubfields: `$0 ${authData.prefix}${authData.startWithNumber}`,
            uncontrolledDigitSubfields: '',
          };
          const userPermissions = [
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ];
          const subjectValue = authorityHeading;

          let user;
          let createdInstanceId;
          let createdAuthorityId;

          before('Create test data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C407685');
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C407685');

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
                createdAuthorityId = createdRecordId;
              });
            })
              .then(() => {
                QuickMarcEditor.linkMarcRecordsViaApi({
                  bibId: createdInstanceId,
                  authorityIds: [createdAuthorityId],
                  bibFieldTags: [linkedFieldData.tag],
                  authorityFieldTags: [authorityFields[0].tag],
                  finalBibFieldContents: [authorityFields[0].content],
                });
              })
              .then(() => {
                cy.setTenant(Affiliations.College);
                cy.createTempUser(userPermissions).then((createdUserProperties) => {
                  user = createdUserProperties;

                  cy.resetTenant();
                  cy.assignAffiliationToUser(Affiliations.University, user.userId);
                  cy.assignPermissionsToExistingUser(user.userId, userPermissions);

                  cy.setTenant(Affiliations.University);
                  cy.assignPermissionsToExistingUser(user.userId, userPermissions);
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
            MarcAuthority.deleteViaAPI(createdAuthorityId);
            InventoryInstance.deleteInstanceViaApi(createdInstanceId);

            cy.setTenant(Affiliations.College);
            Users.deleteViaApi(user.userId);
          });

          it(
            'C407685 Delete linked field from Shared MARC bib linked with Shared MARC authority in Member tenant (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C407685'] },
            () => {
              InventorySearchAndFilter.clearDefaultHeldbyFilter();
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

              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
              InventoryInstances.waitContentLoading();

              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.checkValueAbsenceInDetailView(subjectAccordionName, subjectValue);

              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.checkTagAbsent(linkedFieldData.tag);

              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();

              MarcAuthorities.searchBeats(authorityHeading);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeading, '');

              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              MarcAuthorities.waitLoading();

              MarcAuthorities.searchBeats(authorityHeading);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeading, '');

              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventoryInstances.waitContentLoading();

              InventorySearchAndFilter.clearDefaultHeldbyFilter();
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.checkValueAbsenceInDetailView(subjectAccordionName, subjectValue);

              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.checkTagAbsent(linkedFieldData.tag);
            },
          );
        });
      });
    });
  });
});
