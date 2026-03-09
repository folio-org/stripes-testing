import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { getRandomLetters } from '../../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import { APPLICATION_NAMES, INSTANCE_SOURCE_NAMES } from '../../../../../../support/constants';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenuNavigation from '../../../../../../support/fragments/topMenuNavigation';
import InventoryViewSource from '../../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Automated linking', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();
          const randomLetters = getRandomLetters(15);
          const tags = {
            tag100: '100',
            tag245: '245',
            tag700: '700',
          };
          const testData = {
            contributorSectionId: 'list-contributors',
            contributorsAccordionName: 'Contributor',
          };
          const bibTitle = `AT_C422155_MarcBibInstance_${randomPostfix}`;
          const marcAuthoritySubfieldACentral = `AT_C422155_MarcAuthority_${randomPostfix}_Central,`;
          const authorityHeadingCentral = `${marcAuthoritySubfieldACentral} 1972-`;
          const authorityHeadingCollege = `AT_C422155_MarcAuthority_${randomPostfix}_College`;
          const bibFieldSubfieldA1 = 'Field700_1';
          const bibFieldSubfieldA2 = 'Field700_2';
          const bibNotControllableSubfield1 = 'author';
          const bibNotControllableSubfield2 = 'narrator';
          const bibNotControllableSubfield2a = 'eng';
          const newNotControllableSubfield = 'illustrator';
          const automatedLinkingCallouts = [
            'Field 700 has been linked to MARC authority record(s).',
            'Field 700 must be set manually by selecting the link icon.',
          ];
          const authDataCentral = { prefix: randomLetters, startWithNumber: 1 };
          const authDataCollege = { prefix: randomLetters, startWithNumber: 255 };
          const authorityFieldsCentral = [
            {
              tag: tags.tag100,
              content: `$a ${marcAuthoritySubfieldACentral} $d 1972-`,
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
          const newFields = [
            {
              rowIndex: 5,
              tag: tags.tag700,
              content: `$a ${bibFieldSubfieldA1} $e ${bibNotControllableSubfield1} $0 ${authDataCentral.prefix}${authDataCentral.startWithNumber}`,
            },
            {
              rowIndex: 6,
              tag: tags.tag700,
              content: `$a ${bibFieldSubfieldA2} $e ${bibNotControllableSubfield2} $l ${bibNotControllableSubfield2a} $0 ${authDataCollege.prefix}${authDataCollege.startWithNumber}`,
            },
          ];
          const linkedFieldData = {
            rowIndex: newFields[0].rowIndex,
            tag: newFields[0].tag,
            ind1: '\\',
            ind2: '\\',
            controlledLetterSubfields: authorityFieldsCentral[0].content,
            uncontrolledLetterSubfields: `$e ${bibNotControllableSubfield1}`,
            controlledDigitSubfields: `$0 ${authDataCentral.prefix}${authDataCentral.startWithNumber}`,
            uncontrolledDigitSubfields: '',
          };
          const updatedFifthBoxValue = `$e ${bibNotControllableSubfield1} $e ${newNotControllableSubfield}`;
          const linkedContributorValue = authorityHeadingCentral;
          const notLinkedContributorValue = `${bibFieldSubfieldA2} ${bibNotControllableSubfield2a}`;

          let user;
          let createdAuthorityIdCentral;
          let createdAuthorityIdCollege;

          before('Create test data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422155');
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C422155');

            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            ]).then((createdUserProperties) => {
              user = createdUserProperties;

              cy.assignAffiliationToUser(Affiliations.College, user.userId);

              cy.setTenant(Affiliations.College);
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422155');

              cy.then(() => {
                cy.resetTenant();
                MarcAuthorities.createMarcAuthorityViaAPI(
                  authDataCentral.prefix,
                  authDataCentral.startWithNumber,
                  authorityFieldsCentral,
                ).then((createdRecordId) => {
                  createdAuthorityIdCentral = createdRecordId;
                });
              })
                .then(() => {
                  cy.setTenant(Affiliations.College);
                  MarcAuthorities.createMarcAuthorityViaAPI(
                    authDataCollege.prefix,
                    authDataCollege.startWithNumber,
                    authorityFieldsCollege,
                  ).then((createdRecordId) => {
                    createdAuthorityIdCollege = createdRecordId;
                  });
                })
                .then(() => {
                  cy.setTenant(Affiliations.College);
                  cy.assignPermissionsToExistingUser(user.userId, [
                    Permissions.inventoryAll.gui,
                    Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                    Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
                  ]);
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
            InventoryInstances.deleteInstanceByTitleViaApi(bibTitle);
            Users.deleteViaApi(user.userId);
            MarcAuthority.deleteViaAPI(createdAuthorityIdCentral, true);
            cy.setTenant(Affiliations.College);
            MarcAuthority.deleteViaAPI(createdAuthorityIdCollege, true);
          });

          it(
            'C422155 Verify that fields of Shared MARC bib will be linked only with Shared MARC authority records automatically when linking on Central tenant from Create screen (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C422155'] },
            () => {
              InventoryInstance.newMarcBibRecord();
              QuickMarcEditor.updateLDR06And07Positions();
              QuickMarcEditor.updateExistingField(tags.tag245, `$a ${bibTitle}`);

              newFields.forEach((field) => {
                MarcAuthority.addNewField(field.rowIndex - 1, field.tag, field.content);
                QuickMarcEditor.verifyTagValue(field.rowIndex, field.tag);
                QuickMarcEditor.checkContent(field.content, field.rowIndex);
              });
              QuickMarcEditor.verifyEnabledLinkHeadingsButton();

              QuickMarcEditor.clickLinkHeadingsButton();
              automatedLinkingCallouts.forEach((callout) => {
                QuickMarcEditor.checkCallout(callout);
              });
              QuickMarcEditor.verifyEnabledLinkHeadingsButton();
              QuickMarcEditor.verifyTagFieldAfterLinking(...Object.values(linkedFieldData));
              QuickMarcEditor.verifyRowLinked(newFields[1].rowIndex, false);
              QuickMarcEditor.verifyTagValue(newFields[1].rowIndex, newFields[1].tag);
              QuickMarcEditor.checkContent(newFields[1].content, newFields[1].rowIndex);

              QuickMarcEditor.fillLinkedFieldBox(newFields[0].rowIndex, 5, updatedFifthBoxValue);

              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkAfterSaveAndClose();
              InventoryInstance.verifyInstanceTitle(bibTitle);
              InventoryInstance.checkAuthorityAppIconInSection(
                testData.contributorSectionId,
                linkedContributorValue,
                true,
              );

              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              InventoryInstances.waitContentLoading();

              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();

              MarcAuthorities.searchBeats(authorityHeadingCollege);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeadingCollege, '');
              MarcAuthority.verifyLocalAuthorityDetailsHeading(authorityHeadingCollege);

              MarcAuthorities.searchBeats(authorityHeadingCentral);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeadingCentral, '1');
              MarcAuthority.verifySharedAuthorityDetailsHeading(authorityHeadingCentral);

              MarcAuthorities.clickNumberOfTitlesByHeading(authorityHeadingCentral);
              InventoryInstance.waitInstanceRecordViewOpened();
              InventoryInstance.verifyInstanceTitle(bibTitle);
              InventoryInstance.verifySourceInAdministrativeData(INSTANCE_SOURCE_NAMES.MARC);
              InventoryInstance.checkAuthorityAppIconInSection(
                testData.contributorSectionId,
                linkedContributorValue,
                true,
              );
              InventoryInstance.checkAuthorityAppIconInSection(
                testData.contributorSectionId,
                notLinkedContributorValue,
                false,
              );

              InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
                testData.contributorsAccordionName,
              );
              MarcAuthorities.waitLoading();
              MarcAuthority.verifySharedAuthorityDetailsHeading(authorityHeadingCentral);

              InventoryInstance.goToPreviousPage();
              InventoryInstance.waitInstanceRecordViewOpened();
              InventoryInstance.verifyInstanceTitle(bibTitle);
              InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
                testData.contributorsAccordionName,
              );
              MarcAuthorities.waitLoading();
              MarcAuthority.verifySharedAuthorityDetailsHeading(authorityHeadingCentral);

              InventoryInstance.goToPreviousPage();
              InventoryInstance.waitInstanceRecordViewOpened();
              InventoryInstance.verifyInstanceTitle(bibTitle);
              InventoryInstance.viewSource();
              InventoryViewSource.verifyLinkedToAuthorityIcon(linkedFieldData.rowIndex);

              InventoryViewSource.clickViewMarcAuthorityIcon();
              MarcAuthorities.waitLoading();
              MarcAuthority.verifySharedAuthorityDetailsHeading(authorityHeadingCentral);

              InventoryInstance.goToPreviousPage();
              InventoryInstance.waitInstanceRecordViewOpened();
              InventoryInstance.verifyInstanceTitle(bibTitle);
              InventoryInstance.viewSource();
              InventoryViewSource.verifyLinkedToAuthorityIcon(linkedFieldData.rowIndex);
              InventoryViewSource.clickViewMarcAuthorityIcon();
              MarcAuthorities.waitLoading();
              MarcAuthority.verifySharedAuthorityDetailsHeading(authorityHeadingCentral);
            },
          );
        });
      });
    });
  });
});
