import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import { Permissions } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      describe('Consortia', () => {
        const randomFourDigits = randomFourDigitNumber();
        const testData = {
          tag100: '100',
          tag010: '010',
          tag016: '016',
          tag046: '046',
          tag377: '377',
          tag400: '400',
          title: 'Dante Alighieri C405537, 1265-2024',
          updatedTitle: `Dante Alighieri C405537, 1265-2024, Divine Comedy ${randomFourDigits}`,
          updatedTag100Value: `$a Dante Alighieri C405537, $d 1265-2024, $t Divine Comedy ${randomFourDigits}`,
          updatedTag046Value: '$g 928-125-2024 $2 asmg',
          tag400Value: `$a Данте Алигери C405537 ${randomFourDigits} $d 1265-1321`,
          tag010Value: '$a n78095495405537',
          tag377Value: '$a itaC405537',
          viewSharedRecordText: 'Shared MARC authority record',
          editSharedRecordText: 'Edit shared MARC authority record',
        };
        const marcFile = {
          marc: 'marcAuthFileC405537.mrc',
          fileName: `testMarcFileC405537.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
        };
        let createdAuthorityID;

        before('Create test data', () => {
          cy.getAdminToken();
          cy.resetTenant();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C405537');
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityID = record.authority.id;
            });
          });

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            ]);

            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, testData.userProperties.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            ]);
            cy.intercept('/authn/refresh').as('/authn/refresh');
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            }).then(() => {
              cy.reload();
              cy.wait('@/authn/refresh', { timeout: 20000 });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              MarcAuthorities.waitLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthority.deleteViaAPI(createdAuthorityID);
          Users.deleteViaApi(testData.userProperties.userId);
        });

        it(
          'C405537 Shared "MARC authority" record edited on Member 1 tenant is updated in Central and Member 2 tenants (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C405537'] },
          () => {
            MarcAuthorities.searchBeats(testData.title);
            MarcAuthorities.select(createdAuthorityID);
            MarcAuthority.verifySharedAuthorityDetailsHeading(testData.title);
            MarcAuthority.contains(testData.viewSharedRecordText);
            MarcAuthority.edit();
            // To be uncommented when UIMARCAUTH-385 is fixed
            // QuickMarcEditor.checkPaneheaderContains(testData.editSharedRecordText);
            QuickMarcEditor.addEmptyFields(8);
            QuickMarcEditor.checkEmptyFieldAdded(9);
            QuickMarcEditor.addValuesToExistingField(
              8,
              testData.tag400,
              testData.tag400Value,
              '0',
              '\\',
            );
            QuickMarcEditor.checkContentByTag(testData.tag400, testData.tag400Value);
            QuickMarcEditor.verifyIndicatorValue(testData.tag400, '0', 0);
            QuickMarcEditor.verifyIndicatorValue(testData.tag400, '\\', 1);
            QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag377);
            QuickMarcEditor.afterDeleteNotification(testData.tag377);
            QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value);
            QuickMarcEditor.checkContentByTag(testData.tag100, testData.updatedTag100Value);
            QuickMarcEditor.updateExistingField(testData.tag046, testData.updatedTag046Value);
            QuickMarcEditor.checkContentByTag(testData.tag046, testData.updatedTag046Value);
            QuickMarcEditor.clickArrowDownButton(4);
            QuickMarcEditor.verifyTagValue(5, testData.tag010);
            MarcAuthority.clickSaveAndCloseButton();
            cy.wait(1500);
            MarcAuthority.clickSaveAndCloseButton();
            QuickMarcEditor.checkDeleteModal(1);
            MarcAuthority.continueWithSaveAndCheck();
            MarcAuthority.contains(testData.updatedTag100Value);
            MarcAuthority.contains(testData.updatedTag046Value);
            MarcAuthority.contains(testData.tag400Value);
            MarcAuthority.notContains(testData.tag377Value);
            MarcAuthority.verifyFieldPositionInView(5, testData.tag010, testData.tag010Value);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            MarcAuthorities.waitLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            MarcAuthorities.searchBeats(testData.updatedTitle);
            MarcAuthorities.select(createdAuthorityID);
            MarcAuthority.verifySharedAuthorityDetailsHeading(testData.updatedTitle);
            MarcAuthority.contains(testData.viewSharedRecordText);
            MarcAuthority.contains(testData.updatedTag100Value);
            MarcAuthority.contains(testData.updatedTag046Value);
            MarcAuthority.contains(testData.tag400Value);
            MarcAuthority.notContains(testData.tag377Value);
            MarcAuthority.verifyFieldPositionInView(5, testData.tag010, testData.tag010Value);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
            MarcAuthorities.waitLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
            MarcAuthorities.searchBeats(testData.updatedTitle);
            MarcAuthorities.select(createdAuthorityID);
            MarcAuthority.verifySharedAuthorityDetailsHeading(testData.updatedTitle);
            // To be uncommented when UIMARCAUTH-385 is fixed
            // MarcAuthority.contains(testData.viewSharedRecordText);
            MarcAuthority.contains(testData.updatedTag100Value);
            MarcAuthority.contains(testData.updatedTag046Value);
            MarcAuthority.contains(testData.tag400Value);
            MarcAuthority.notContains(testData.tag377Value);
            MarcAuthority.verifyFieldPositionInView(5, testData.tag010, testData.tag010Value);
          },
        );
      });
    });
  });
});
