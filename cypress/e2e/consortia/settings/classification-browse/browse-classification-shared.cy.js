import permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ClassificationIdentifierTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/instances/classificationIdentifierTypesConsortiumManager';
import ClassificationIdentifierTypes from '../../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import { APPLICATION_NAMES, BROWSE_CLASSIFICATION_OPTIONS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import ClassificationBrowse from '../../../../support/fragments/settings/inventory/instances/classificationBrowse';

const testData = {
  sharedTypeName: getTestEntityValue('C451650_Shared'),
  localCentralTypeName: getTestEntityValue('C451650_Local_Central'),
  localCollegeTypeName: getTestEntityValue('C451650_Local_College'),
  classificationBrowseOption: BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
};

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Classification browse', () => {
      before('Consortia', () => {
        cy.getAdminToken();
        cy.then(() => {
          ClassificationIdentifierTypes.createViaApi({
            name: testData.localCentralTypeName,
            source: 'local',
          }).then((response) => {
            testData.localCentralTypeId = response.body.id;
          });
          cy.setTenant(Affiliations.College);
          ClassificationIdentifierTypes.createViaApi({
            name: testData.localCollegeTypeName,
            source: 'local',
          }).then((response) => {
            testData.localCollegeTypeId = response.body.id;
          });
          cy.resetTenant();
          ClassificationIdentifierTypesConsortiumManager.createViaApi({
            payload: { name: testData.sharedTypeName },
          }).then((type) => {
            testData.sharedType = type;
          });
        }).then(() => {
          cy.createTempUser([
            permissions.uiInventorySettingsConfigureClassificationBrowse.gui,
          ]).then((userProperties) => {
            testData.testUser = userProperties;
            cy.assignAffiliationToUser(Affiliations.College, testData.testUser.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.testUser.userId, [
              permissions.uiInventorySettingsConfigureClassificationBrowse.gui,
            ]);
            cy.resetTenant();
            cy.login(testData.testUser.username, testData.testUser.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Inventory');
            cy.intercept('browse/config/instance-classification*').as('instanceClassifications');
            ClassificationBrowse.openClassificationBrowse();
            cy.wait('@instanceClassifications');
          });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        ClassificationIdentifierTypesConsortiumManager.deleteViaApi(testData.sharedType);
        ClassificationIdentifierTypes.deleteViaApi(testData.localCentralTypeId);
        Users.deleteViaApi(testData.testUser.userId);
        cy.setTenant(Affiliations.College);
        ClassificationIdentifierTypes.deleteViaApi(testData.localCollegeTypeId);
      });

      it(
        'C451650 Only Shared "Classification identifier types" are displayed in "Classification identifier types" multi-select dropdown on Central and Member tenants (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C451650'] },
        () => {
          ClassificationBrowse.clickEditButtonInBrowseOption(testData.classificationBrowseOption);
          ClassificationBrowse.checkClassificationIdentifierTypesExistsInBrowseoption(
            testData.classificationBrowseOption,
          );
          ClassificationBrowse.checkCancelButtonEnabledInBrowseOption(
            testData.classificationBrowseOption,
          );
          ClassificationBrowse.checkSaveButtonEnabledInBrowseOption(
            testData.classificationBrowseOption,
            false,
          );
          ClassificationBrowse.expandClassificationIdentifierTypesDropdownInBrowseOption(
            testData.classificationBrowseOption,
          );
          ClassificationBrowse.checkClassificationIdentifierTypesDropdownDefaultOptions();
          [testData.localCentralTypeName, testData.sharedTypeName].forEach((typeName) => {
            ClassificationBrowse.checkClassificationIdentifierTypesDropdownOption(typeName);
          });
          ClassificationBrowse.checkClassificationIdentifierTypesDropdownOption(
            testData.localCollegeTypeName,
            false,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ClassificationBrowse.openClassificationBrowse();

          ClassificationBrowse.clickEditButtonInBrowseOption(testData.classificationBrowseOption);
          ClassificationBrowse.checkClassificationIdentifierTypesExistsInBrowseoption(
            testData.classificationBrowseOption,
          );
          ClassificationBrowse.checkCancelButtonEnabledInBrowseOption(
            testData.classificationBrowseOption,
          );
          ClassificationBrowse.checkSaveButtonEnabledInBrowseOption(
            testData.classificationBrowseOption,
            false,
          );
          ClassificationBrowse.expandClassificationIdentifierTypesDropdownInBrowseOption(
            testData.classificationBrowseOption,
          );
          ClassificationBrowse.checkClassificationIdentifierTypesDropdownDefaultOptions();
          [testData.localCentralTypeName, testData.sharedTypeName].forEach((typeName) => {
            ClassificationBrowse.checkClassificationIdentifierTypesDropdownOption(typeName);
          });
          ClassificationBrowse.checkClassificationIdentifierTypesDropdownOption(
            testData.localCollegeTypeName,
            false,
          );
        },
      );
    });
  });
});
