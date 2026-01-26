import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
      const testData = {
        authorityTitle: 'C407654 Lentz Local M1',
        tag100: '100',
        instanceTitle: 'C407654 Instance Local M1',
        updated100FieldValue: 'C407654 Lentz Local M1 (Updated in M1)',
        authoritySearchOption: 'Keyword',
        instanceSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
      };

      const linkingTagAndValues = {
        authorityHeading: 'C407654 Lentz Local M1',
        rowIndex: 16,
        tag: '100',
        secondBox: '1',
        thirdBox: '\\',
        content: '$a C407654 Lentz Local M1 (Updated in M1)',
        eSubfield: '',
        zeroSubfield: '$0 http://id.loc.gov/authorities/names/n2011049161407654',
        seventhBox: '',
      };

      const users = {};

      const marcFiles = [
        {
          marc: 'marcBibFileForC407654.mrc',
          fileNameImported: `testMarcFileC397343.${getRandomPostfix()}.mrc`,
          propertyName: 'instance',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
        {
          marc: 'marcAuthFileForC407654.mrc',
          fileNameImported: `testMarcFileC397343.${getRandomPostfix()}.mrc`,
          propertyName: 'authority',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
      ];

      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C407654');
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407654');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.moduleDataImportEnabled.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            ]);
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            InventoryInstances.deleteInstanceByTitleViaApi('C407654');
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407654');
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          })
          .then(() => {
            cy.setTenant(Affiliations.University);
            InventoryInstances.deleteInstanceByTitleViaApi('C407654');
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407654');
            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileNameImported,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
            cy.resetTenant();
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            }).then(() => {
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              InventoryInstances.waitContentLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
              InventoryInstances.waitContentLoading();
              InventoryInstances.searchByTitle(createdRecordIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(linkingTagAndValues.authorityHeading);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                linkingTagAndValues.tag,
                linkingTagAndValues.rowIndex,
              );
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkAfterSaveAndClose();
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        cy.setTenant(Affiliations.University);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
      });

      it(
        'C407654 Update local linked "MARC Authority" record in member tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C407654'] },
        () => {
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.authorityTitle);
          MarcAuthorities.selectTitle(testData.authorityTitle);
          MarcAuthority.edit();
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updated100FieldValue);
          QuickMarcEditor.checkContent(testData.updated100FieldValue, 8);
          QuickMarcEditor.checkButtonsEnabled();
          // if clicked too fast, delete modal might not appear
          cy.wait(1000);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyUpdateLinkedBibsKeepEditingModal(1);
          QuickMarcEditor.confirmUpdateLinkedBibsKeepEditing(1);
          cy.visit(TopMenu.inventoryPath);
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            linkingTagAndValues.rowIndex,
            linkingTagAndValues.tag,
            linkingTagAndValues.secondBox,
            linkingTagAndValues.thirdBox,
            linkingTagAndValues.content,
            linkingTagAndValues.eSubfield,
            linkingTagAndValues.zeroSubfield,
            linkingTagAndValues.seventhBox,
          );
          QuickMarcEditor.closeEditorPane();

          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          InventorySearchAndFilter.searchByParameter(
            testData.instanceSearchOption,
            testData.instanceTitle,
          );
          InventoryInstance.verifyNoResultFoundMessage(
            `No results found for "${testData.instanceTitle}". Please check your spelling and filters.`,
          );
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.updated100FieldValue);
          MarcAuthorities.checkNoResultsMessage(
            `No results found for "${testData.updated100FieldValue}". Please check your spelling and filters.`,
          );

          cy.visit(TopMenu.inventoryPath);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.searchByParameter(
            testData.instanceSearchOption,
            testData.instanceTitle,
          );
          InventoryInstance.verifyNoResultFoundMessage(
            `No results found for "${testData.instanceTitle}". Please check your spelling and filters.`,
          );
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.updated100FieldValue);
          MarcAuthorities.checkNoResultsMessage(
            `No results found for "${testData.updated100FieldValue}". Please check your spelling and filters.`,
          );
        },
      );
    });
  });
});
