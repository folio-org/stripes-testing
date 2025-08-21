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
          tag035: '035',
          tag040: '040',
          tag670: '670',
          tag400: '400',
          title:
            'Alexandre, Dumas, C405544 1802-1870. Trois mousquetaires. English (First Avenue Editions (Firm))',
          updatedTitle: `Alexandre, Dumas, C405544 1802-1870, ${randomFourDigits}`,
          updatedTag100Value: `$a Alexandre, Dumas, C405544 $d 1802-1870, ${randomFourDigits} $l English (First Avenue Editions (Firm)) $e Novelist ${randomFourDigits}`,
          tag400Value: `$a Аляксандр Дзюма ${randomFourDigits} $d 1802-1870`,
          tag035Value: '$a (OCoLC)oca12345405544',
          tag670Value: '$a Alexandre, Dumas. C405544 The three musketeers [ER], ©2014',
          viewLocalRecordText: 'Local MARC authority record',
          editLocalRecordText: 'Edit local MARC authority record',
          resultAbsenceMessage: (heading) => `No results found for "${heading}".`,
        };
        const marcFile = {
          marc: 'marcAuthFileC405544.mrc',
          fileName: `testMarcFileC405544.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        };
        let createdAuthorityID;

        before('Create test data', () => {
          cy.getAdminToken();
          cy.loginAsAdmin({
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          }).then(() => {
            DataImport.waitLoading();
            cy.setTenant(Affiliations.College);
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C405544');
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityID = record[marcFile.propertyName].id;
              });
            });
          });

          cy.resetTenant();
          cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
            (createdUserProperties) => {
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

              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              }).then(() => {
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
                MarcAuthorities.waitLoading();
              });
            },
          );
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          cy.setTenant(Affiliations.College);
          MarcAuthority.deleteViaAPI(createdAuthorityID);
        });

        it(
          'C405544 Edit Local "MARC authority" record on Member 1 tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C405544'] },
          () => {
            MarcAuthorities.searchBeats(testData.title);
            MarcAuthorities.select(createdAuthorityID);
            MarcAuthority.verifyLocalAuthorityDetailsHeading(testData.title);
            MarcAuthority.contains(testData.viewLocalRecordText);
            MarcAuthority.edit();
            QuickMarcEditor.checkPaneheaderContains(testData.editLocalRecordText);
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
            QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag670);
            QuickMarcEditor.afterDeleteNotification(testData.tag670);
            QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value);
            QuickMarcEditor.checkContentByTag(testData.tag100, testData.updatedTag100Value);
            QuickMarcEditor.clickArrowDownButton(5);
            QuickMarcEditor.verifyTagValue(6, testData.tag035);
            MarcAuthority.clickSaveAndCloseButton();
            QuickMarcEditor.checkDeleteModal(1);
            MarcAuthority.continueWithSaveAndCheck();
            MarcAuthority.contains(testData.updatedTag100Value);
            MarcAuthority.contains(testData.tag400Value);
            MarcAuthority.notContains(testData.tag670Value);
            MarcAuthority.verifyFieldPositionInView(6, testData.tag035, testData.tag035Value);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            MarcAuthorities.waitLoading();
            MarcAuthorities.searchBeats(testData.updatedTitle);
            MarcAuthorities.checkNoResultsMessage(
              testData.resultAbsenceMessage(testData.updatedTitle),
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
            MarcAuthorities.waitLoading();
            MarcAuthorities.searchBeats(testData.updatedTitle);
            MarcAuthorities.checkNoResultsMessage(
              testData.resultAbsenceMessage(testData.updatedTitle),
            );
          },
        );
      });
    });
  });
});
