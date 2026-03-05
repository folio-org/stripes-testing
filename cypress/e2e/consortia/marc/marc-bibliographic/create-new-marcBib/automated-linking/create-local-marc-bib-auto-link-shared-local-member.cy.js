import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { getRandomLetters } from '../../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';

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
            tag600: '600',
            tag700: '700',
            tag710: '710',
          };
          const testData = {
            contributorSectionId: 'list-contributors',
            subjectSectionId: 'list-subject',
            contributorsAccordionName: 'Contributor',
            subjectsAccordionName: 'Subject',
          };
          const bibTitle = `AT_C422156_MarcBibInstance_${randomPostfix}`;
          const authorityHeadingCentral = `AT_C422156_MarcAuthority_${randomPostfix}_Central`;
          const authorityHeadingCollege = `AT_C422156_MarcAuthority_${randomPostfix}_College`;
          const authorityHeadingUniversity = `AT_C422156_MarcAuthority_${randomPostfix}_University`;
          const automatedLinkingCallouts = [
            'Field 600 and 700 has been linked to MARC authority record(s).',
            'Field 710 must be set manually by selecting the link icon.',
          ];
          const authDataCentral = { prefix: randomLetters, startWithNumber: 1 };
          const authDataCollege = { prefix: randomLetters, startWithNumber: 25 };
          const authDataUniversity = { prefix: randomLetters, startWithNumber: 301 };
          const authorityFieldsCentral = [
            {
              tag: tags.tag100,
              content: `$a ${authorityHeadingCentral}`,
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
              tag: tags.tag100,
              content: `$a ${authorityHeadingUniversity}`,
              indicators: ['1', '\\'],
            },
          ];
          const newFields = [
            {
              rowIndex: 5,
              tag: tags.tag600,
              indexes: ['1', '0'],
              content: `$a ${authorityHeadingCentral} $0 ${authDataCentral.prefix}${authDataCentral.startWithNumber}`,
            },
            {
              rowIndex: 6,
              tag: tags.tag700,
              indexes: ['\\', '\\'],
              content: `$a ${authorityHeadingCollege} $0 ${authDataCollege.prefix}${authDataCollege.startWithNumber}`,
            },
            {
              rowIndex: 7,
              tag: tags.tag710,
              indexes: ['\\', '\\'],
              content: `$a ${authorityHeadingUniversity} $0 ${authDataUniversity.prefix}${authDataUniversity.startWithNumber}`,
            },
          ];
          const linkedFieldData600 = {
            rowIndex: newFields[0].rowIndex,
            tag: newFields[0].tag,
            ind1: newFields[0].indexes[0],
            ind2: newFields[0].indexes[1],
            controlledLetterSubfields: authorityFieldsCentral[0].content,
            uncontrolledLetterSubfields: '',
            controlledDigitSubfields: `$0 ${authDataCentral.prefix}${authDataCentral.startWithNumber}`,
            uncontrolledDigitSubfields: '',
          };
          const linkedFieldData700 = {
            rowIndex: newFields[1].rowIndex,
            tag: newFields[1].tag,
            ind1: newFields[1].indexes[0],
            ind2: newFields[1].indexes[1],
            controlledLetterSubfields: authorityFieldsCollege[0].content,
            uncontrolledLetterSubfields: '',
            controlledDigitSubfields: `$0 ${authDataCollege.prefix}${authDataCollege.startWithNumber}`,
            uncontrolledDigitSubfields: '',
          };
          const linkedSubjectValue = authorityHeadingCentral;
          const linkedContributorValue = authorityHeadingCollege;
          const notLinkedContributorValue = authorityHeadingUniversity;

          let user;
          let createdAuthorityIdCentral;
          let createdAuthorityIdCollege;
          let createdAuthorityIdUniversity;

          before('Create user, data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422156');

            cy.then(() => {
              cy.setTenant(Affiliations.College);
              cy.createTempUser([
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              ]).then((createdUserProperties) => {
                user = createdUserProperties;
                MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422156');
                InventoryInstances.deleteInstanceByTitleViaApi('AT_C422156');

                cy.resetTenant();
                cy.assignPermissionsToExistingUser(user.userId, [
                  Permissions.inventoryAll.gui,
                  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                ]);
                cy.assignAffiliationToUser(Affiliations.University, user.userId);

                cy.setTenant(Affiliations.University);
                MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422156');
                cy.assignPermissionsToExistingUser(user.userId, [
                  Permissions.inventoryAll.gui,
                  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                ]);
              });
            })
              .then(() => {
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
                cy.setTenant(Affiliations.University);
                MarcAuthorities.createMarcAuthorityViaAPI(
                  authDataUniversity.prefix,
                  authDataUniversity.startWithNumber,
                  authorityFieldsUniversity,
                ).then((createdRecordId) => {
                  createdAuthorityIdUniversity = createdRecordId;
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

          after('Delete user, data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthority.deleteViaAPI(createdAuthorityIdCentral, true);
            cy.setTenant(Affiliations.College);
            MarcAuthority.deleteViaAPI(createdAuthorityIdCollege, true);
            InventoryInstances.deleteInstanceByTitleViaApi(bibTitle);
            Users.deleteViaApi(user.userId);
            cy.setTenant(Affiliations.University);
            MarcAuthority.deleteViaAPI(createdAuthorityIdUniversity, true);
          });

          it(
            'C422156 Auto-Link Local MARC bib with Shared/Local MARC auth on Member tenant in Create screen (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'C422156'] },
            () => {
              InventoryInstance.newMarcBibRecord();
              QuickMarcEditor.updateLDR06And07Positions();
              QuickMarcEditor.updateExistingField(tags.tag245, `$a ${bibTitle}`);

              newFields.forEach((field) => {
                MarcAuthority.addNewField(
                  field.rowIndex - 1,
                  field.tag,
                  field.content,
                  field.indexes[0],
                  field.indexes[1],
                );
                QuickMarcEditor.verifyTagField(
                  field.rowIndex,
                  field.tag,
                  field.indexes[0],
                  field.indexes[1],
                  field.content,
                  '',
                );
              });
              QuickMarcEditor.verifyEnabledLinkHeadingsButton();

              QuickMarcEditor.clickLinkHeadingsButton();
              automatedLinkingCallouts.forEach((callout) => {
                QuickMarcEditor.checkCallout(callout);
              });
              QuickMarcEditor.verifyEnabledLinkHeadingsButton();
              QuickMarcEditor.verifyTagFieldAfterLinking(...Object.values(linkedFieldData600));
              QuickMarcEditor.verifyTagFieldAfterLinking(...Object.values(linkedFieldData700));
              QuickMarcEditor.verifyRowLinked(newFields[2].rowIndex, false);
              QuickMarcEditor.verifyTagValue(newFields[2].rowIndex, newFields[2].tag);
              QuickMarcEditor.checkContent(newFields[2].content, newFields[2].rowIndex);

              QuickMarcEditor.verifyAuthorityIdForViewAuthorityIcon(
                newFields[0].tag,
                createdAuthorityIdCentral,
              );
              QuickMarcEditor.verifyAuthorityIdForViewAuthorityIcon(
                newFields[1].tag,
                createdAuthorityIdCollege,
              );

              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkAfterSaveAndClose();
              InventoryInstance.verifyInstanceTitle(bibTitle);
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
              MarcAuthority.verifyLocalAuthorityDetailsHeading(authorityHeadingCollege);

              InventoryInstance.goToPreviousPage();
              InventoryInstance.waitInstanceRecordViewOpened();
              InventoryInstance.verifyInstanceTitle(bibTitle);
              InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
                testData.contributorsAccordionName,
              );
              MarcAuthorities.waitLoading();
              MarcAuthority.verifyLocalAuthorityDetailsHeading(authorityHeadingCollege);

              InventoryInstance.goToPreviousPage();
              InventoryInstance.waitInstanceRecordViewOpened();
              InventoryInstance.verifyInstanceTitle(bibTitle);
              InventoryInstance.checkAuthorityAppIconInSection(
                testData.subjectSectionId,
                linkedSubjectValue,
                true,
              );
              InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
                testData.subjectsAccordionName,
              );
              MarcAuthorities.waitLoading();
              MarcAuthority.verifySharedAuthorityDetailsHeading(authorityHeadingCentral);

              InventoryInstance.goToPreviousPage();
              InventoryInstance.waitInstanceRecordViewOpened();
              InventoryInstance.verifyInstanceTitle(bibTitle);
              InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
                testData.subjectsAccordionName,
              );
              MarcAuthorities.waitLoading();
              MarcAuthority.verifySharedAuthorityDetailsHeading(authorityHeadingCentral);

              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
              MarcAuthorities.waitLoading();

              MarcAuthorities.searchBeats(authorityHeadingCentral);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeadingCentral, '');

              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              MarcAuthorities.waitLoading();

              MarcAuthorities.searchBeats(authorityHeadingUniversity);
              MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeadingUniversity, '');
            },
          );
        });
      });
    });
  });
});
