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

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
      const testData = {
        authorityTitle: 'C405927 Lentz Shared',
        tag100: '100',
        updated100FieldValue: 'C405927 Lentz Shared (Updated in C)',
        authoritySearchOption: 'Keyword',
      };

      const users = {};

      const createdRecordIDs = [];

      const marcFiles = [
        {
          marc: 'marcBibFileForC405927-Shared.mrc',
          fileName: `C405927 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
          numOfRecords: 3,
          tenant: tenantNames.central,
        },
        {
          marc: 'marcAuthFileForC405927.mrc',
          fileName: `C405927 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
          numOfRecords: 1,
          tenant: tenantNames.central,
        },
        {
          marc: 'marcBibFileForC405927-Local-M1.mrc',
          fileName: `C405927 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
          numOfRecords: 1,
          tenant: tenantNames.university,
        },
        {
          marc: 'marcBibFileForC405927-Local-M2.mrc',
          fileName: `C405927 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
          numOfRecords: 1,
          tenant: tenantNames.college,
        },
      ];

      const instancesToLinkInM1 = [
        'C405927 Instance Shared 1',
        'C405927 Instance Shared 2',
        'C405927 Instance Local M1',
      ];
      const instancesToLinkInM2 = ['C405927 Instance Shared 3', 'C405927 Instance Local M2'];

      const linkingInTenants = [
        {
          currentTeant: tenantNames.central,
          openingTenat: tenantNames.university,
          linkingInstances: instancesToLinkInM1,
        },
        {
          currentTeant: tenantNames.university,
          openingTenat: tenantNames.college,
          linkingInstances: instancesToLinkInM2,
        },
      ];

      const instancesToCheckInCentral = [
        'C405927 Instance Shared 1',
        'C405927 Instance Shared 2',
        'C405927 Instance Shared 3',
      ];
      const instancesToCheckInM1 = ['C405927 Instance Shared 1', 'C405927 Instance Local M1'];
      const instancesToCheckInM2 = ['C405927 Instance Shared 3', 'C405927 Instance Local M2'];

      const linkingTagAndValues = {
        rowIndex: 16,
        value: 'C405927 Lentz Shared',
        tag: '100',
        secondBox: '1',
        thirdBox: '\\',
        content: '$a C405927 Lentz Shared (Updated in C)',
        eSubfield: '',
        zeroSubfield: '$0 http://id.loc.gov/authorities/names/n2011049161405927',
        seventhBox: '',
      };

      before('Create users, data', () => {
        cy.getAdminToken();

        InventoryInstances.deleteInstanceByTitleViaApi('C405927');
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C405927');
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
            cy.setTenant(Affiliations.University);
            InventoryInstances.deleteInstanceByTitleViaApi('C405927');
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
            cy.resetTenant();
            cy.wait(10_000);
            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.College);
            InventoryInstances.deleteInstanceByTitleViaApi('C405927');
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          })
          .then(() => {
            marcFiles.forEach((marcFile) => {
              if (marcFile.tenant === tenantNames.university) {
                cy.setTenant(Affiliations.University);
              } else if (marcFile.tenant === tenantNames.college) {
                cy.setTenant(Affiliations.College);
              } else {
                cy.resetTenant();
                cy.getAdminToken();
              }

              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });

            linkingInTenants.forEach((tenants) => {
              ConsortiumManager.switchActiveAffiliation(tenants.currentTeant, tenants.openingTenat);
              InventoryInstances.waitContentLoading();
              tenants.linkingInstances.forEach((instance) => {
                InventoryInstances.searchByTitle(instance);
                InventoryInstances.selectInstanceByTitle(instance);
                cy.wait(2000);
                InventoryInstance.editMarcBibliographicRecord();
                QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
                MarcAuthorities.switchToSearch();
                InventoryInstance.verifySelectMarcAuthorityModal();
                InventoryInstance.verifySearchOptions();
                InventoryInstance.searchResults(linkingTagAndValues.value);
                InventoryInstance.clickLinkButton();
                QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                  linkingTagAndValues.tag,
                  linkingTagAndValues.rowIndex,
                );
                QuickMarcEditor.deleteField(4);
                QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
                QuickMarcEditor.checkAfterSaveAndClose();
              });
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[1]);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[2]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[3], true);
        cy.setTenant(Affiliations.University);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[4]);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[5]);
      });

      it(
        'C405927 Update shared linked "MARC Authority" record in Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C405927'] },
        () => {
          cy.login(users.userProperties.username, users.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.authorityTitle);
          MarcAuthorities.selectTitle(`Shared\n${testData.authorityTitle}`);
          MarcAuthority.edit();
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updated100FieldValue);
          QuickMarcEditor.checkContent(testData.updated100FieldValue, 8);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyUpdateLinkedBibsKeepEditingModal(3);
          QuickMarcEditor.confirmUpdateLinkedBibsKeepEditing(3);
          cy.visit(TopMenu.inventoryPath);
          instancesToCheckInCentral.forEach((instance) => {
            InventoryInstances.searchByTitle(instance);
            InventoryInstances.selectInstanceByTitle(instance);
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              linkingTagAndValues.rowIndex - 1,
              linkingTagAndValues.tag,
              linkingTagAndValues.secondBox,
              linkingTagAndValues.thirdBox,
              linkingTagAndValues.content,
              linkingTagAndValues.eSubfield,
              linkingTagAndValues.zeroSubfield,
              linkingTagAndValues.seventhBox,
            );
            QuickMarcEditor.closeEditorPane();
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          InventoryInstances.waitContentLoading();
          instancesToCheckInM1.forEach((instance) => {
            InventoryInstances.searchByTitle(instance);
            InventoryInstances.selectInstanceByTitle(instance);
            cy.wait(2000);
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              linkingTagAndValues.rowIndex - 1,
              linkingTagAndValues.tag,
              linkingTagAndValues.secondBox,
              linkingTagAndValues.thirdBox,
              linkingTagAndValues.content,
              linkingTagAndValues.eSubfield,
              linkingTagAndValues.zeroSubfield,
              linkingTagAndValues.seventhBox,
            );
            QuickMarcEditor.closeEditorPane();
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.college);
          InventoryInstances.waitContentLoading();
          instancesToCheckInM2.forEach((instance) => {
            InventoryInstances.searchByTitle(instance);
            InventoryInstances.selectInstanceByTitle(instance);
            cy.wait(2000);
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              linkingTagAndValues.rowIndex - 1,
              linkingTagAndValues.tag,
              linkingTagAndValues.secondBox,
              linkingTagAndValues.thirdBox,
              linkingTagAndValues.content,
              linkingTagAndValues.eSubfield,
              linkingTagAndValues.zeroSubfield,
              linkingTagAndValues.seventhBox,
            );
            QuickMarcEditor.closeEditorPane();
          });
        },
      );
    });
  });
});
